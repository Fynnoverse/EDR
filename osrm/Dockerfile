# Prepare rail-only OSM data independently of the OSRM image's Debian release.
FROM debian:bookworm-slim AS map-data
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget make osmium-tool \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/host
COPY Makefile countries.wanted filter.params ./
RUN make output/filtered.osm.pbf

FROM ghcr.io/project-osrm/osrm-backend:v5.27.1 AS routing-data
WORKDIR /data
COPY --from=map-data /opt/host/output/filtered.osm.pbf ./filtered.osm.pbf
COPY basic.lua ./basic.lua
RUN osrm-extract -p /data/basic.lua /data/filtered.osm.pbf \
    && osrm-partition /data/filtered.osrm \
    && osrm-customize /data/filtered.osrm

FROM ghcr.io/project-osrm/osrm-backend:v5.27.1
WORKDIR /data
COPY --from=routing-data /data/filtered.osrm* ./
EXPOSE 5000
CMD ["osrm-routed", "--algorithm", "mld", "--max-viaroute-size", "1000", "/data/filtered.osrm"]
