const assert = require('node:assert/strict');
const {test} = require('node:test');
const path = require('node:path');
const load = require('./helpers/loadTypescript.cjs');
const snapshot = require('./fixtures/station-audit-2026-09-09.json');
const root = path.resolve(__dirname, '../..');
const {POSTS, newInternalIdToSrId, stationPositions} = load(root + '/backend/src/config.ts');
const {postConfig, dispatchDirections, dispatchLineDirections} = load(root + '/frontend/src/config/stations.ts');
const {getTrackSide} = load(root + '/frontend/src/EDR/components/Cells/DirectionIndicator.tsx');
const {dispatchController} = load(root + '/backend/src/dispatchController.ts');
const {getStationTimetable} = load(root + '/backend/src/dataTransformer/stations.ts');
const byName = Object.fromEntries(Object.values(postConfig).map(p => [p.srName, p.id]));
const names = Object.fromEntries(snapshot.points.map(p => [p.id, p.name]));
const sorted = values => [...values].sort((a, b) => a - b);
// User-confirmed remote control, absent from the historical API snapshot.
const stations = snapshot.stations.map(station => station.name === 'Pruszków'
    ? {...station, secondaryPosts: [...station.secondaryPosts, {id: 1539, name: 'Józefinów'}]}
    : station);
const trains = snapshot.examples.map(t => ({...t, timetable: t.timetable.map(p => ({
    ...p, plannedStop: 0, stopTypeNumber: 0,
    arrivalTime: '2026-09-09T12:00:00Z', departureTime: '2026-09-09T12:00:00Z'
}))}));

async function dispatch(post, mergePosts, input = trains) {
    const response = {
        code: 200, body: undefined,
        status(code) { this.code = code; return this; },
        setHeader() { return this; },
        send(body) { this.body = body; return this; },
        sendStatus(code) { this.code = code; return this; }
    };
    await dispatchController({params: {post}, query: {mergePosts: String(mergePosts)}}, response, input);
    assert.equal(response.code, 200, `${post}: ${JSON.stringify(response.body)}`);
    return response.body;
}

test('official stations and user-confirmed remote subposts match both configurations', () => {
    assert.equal(snapshot.stations.length, 68);
    assert.equal(snapshot.stations.reduce((count, s) => count + s.secondaryPosts.length, 0), 20);
    for (const station of stations) {
        const key = byName[station.name];
        assert.ok(key, `Missing playable station: ${station.name}`);
        assert.equal(newInternalIdToSrId[key], station.id, station.name);
        assert.ok(stationPositions[station.id], `Missing position: ${station.name}`);
        const expected = [station.id, ...station.secondaryPosts.map(p => p.id)];
        assert.deepEqual(sorted(POSTS[key]), sorted(expected), `Backend group: ${station.name}`);
        const configured = postConfig[key].secondaryPosts ?? [];
        assert.deepEqual(sorted(configured.map(k => newInternalIdToSrId[k])), sorted(expected.slice(1)), `Frontend group: ${station.name}`);
        for (const sub of station.secondaryPosts) {
            const subKey = configured.find(k => newInternalIdToSrId[k] === sub.id);
            assert.equal(postConfig[subKey]?.srName, sub.name, `Subpost name: ${sub.id}`);
        }
    }
});

test('all API groups have finite, unique station IDs and both station enums agree', () => {
    for (const [key, ids] of Object.entries(POSTS)) {
        assert.ok(ids.length && ids.every(Number.isFinite), key);
        assert.equal(ids.length, new Set(ids).size, key);
    }
    assert.deepEqual(load(root + '/backend/src/enum/stationId.ts').StationId,
        load(root + '/frontend/src/enums/stationId.ts').StationId);
});

test('all 669 observed neighbor/line/direction combinations resolve without ambiguous branch assignments', () => {
    assert.equal(snapshot.edges.length, 669);
    for (const edge of snapshot.edges) {
        const label = `${names[edge.pointId]} ${edge.relation} ${names[edge.adjacentPointId]} (line ${edge.line}, train ${edge.exampleTrain})`;
        assert.ok(getTrackSide(String(edge.pointId), String(edge.adjacentPointId), edge.line), label);
        if (!dispatchLineDirections[edge.pointId]?.[edge.adjacentPointId]) {
            const matches = Object.values(dispatchDirections[edge.pointId] ?? {}).filter(ids => ids.includes(edge.adjacentPointId));
            assert.equal(matches.length, 1, label);
        }
    }
});

test('grouped responses retain every train and checkpoint but hide only internal neighbors', async () => {
    for (const station of stations) {
        const group = [station.id, ...station.secondaryPosts.map(p => p.id)];
        const rows = await dispatch(byName[station.name], true);
        const expected = trains.filter(t => t.timetable.some(p => group.includes(Number(p.pointId))));
        assert.deepEqual(rows.map(r => r.trainNoLocal).sort(), expected.map(t => t.trainNoLocal).sort(), station.name);
        for (const row of rows) {
            const timetable = trains.find(t => t.trainNoLocal === row.trainNoLocal).timetable;
            const groupedRows = [row, ...row.secondaryPostsRows];
            const expectedIds = timetable.filter(p => group.includes(Number(p.pointId))).map(p => Number(p.pointId));
            assert.deepEqual(sorted(groupedRows.map(r => Number(r.pointId))), sorted(expectedIds), `${station.name}/${row.trainNoLocal}`);
            for (const r of groupedRows) {
                const current = timetable[r.stationIndex];
                const previous = timetable[r.stationIndex - 1];
                const next = timetable[r.stationIndex + 1];
                const from = previous && !group.includes(Number(previous.pointId)) ? previous : undefined;
                const to = next && !group.includes(Number(next.pointId)) ? next : undefined;
                assert.equal(r.fromPostId, from?.pointId);
                assert.equal(r.toPostId, to?.pointId);
                assert.equal(r.fromLine, from?.line);
                assert.equal(r.toLine, to ? current.line : undefined);
            }
        }
    }
});

test('Koluszki bypass trains appear once and show Rokiciny to Gałkówek across both subposts', async () => {
    const input = trains.filter(t => t.trainNoLocal === '3720');
    const rows = await dispatch('KOL', true, input);
    assert.equal(rows.length, 1);
    const points = [rows[0], ...rows[0].secondaryPostsRows];
    assert.deepEqual(sorted(points.map(p => Number(p.pointId))), [1806, 1807]);
    assert.deepEqual(points.filter(p => p.fromPost).map(p => p.fromPost), ['Rokiciny']);
    assert.deepEqual(points.filter(p => p.toPost).map(p => p.toPost), ['Gałkówek']);
    assert.equal(points.find(p => p.toPost).toLine, 17);
    assert.deepEqual(await dispatch('KOL', false, input), []);
});

test('Łowicz Przedmieście uses line 532 on the correct side of the station in both directions', async () => {
    for (const [trainNo, fromLine, toLine] of [['21250', 15, 532], ['12251', 532, 15]]) {
        const [row] = await getStationTimetable(2418, trains.filter(t => t.trainNoLocal === trainNo));
        assert.equal(row.fromLine, fromLine);
        assert.equal(row.toLine, toLine);
        const relation = trainNo === '21250' ? 'to' : 'from';
        assert.equal(getTrackSide(row.pointId, row[relation + 'PostId'], row[relation + 'Line']), 'up');
    }
});

test('each subpost can also be requested directly with grouping enabled or disabled', async () => {
    for (const station of stations) for (const sub of station.secondaryPosts) {
        const key = byName[sub.name];
        const grouped = await dispatch(key, true);
        const separate = await dispatch(key, false);
        assert.deepEqual(grouped, separate, sub.name);
        assert.ok(grouped.every(row => Number(row.pointId) === sub.id && row.secondaryPostsRows.length === 0));
    }
});
