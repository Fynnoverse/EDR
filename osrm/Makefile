.DEFAULT_GOAL := all
.PHONY: all serve
.PRECIOUS: %.pbf
.DELETE_ON_ERROR:

WANTED_COUNTRIES := $(shell sed 's/\#.*//' countries.wanted)
COUNTRIES_PBF := $(addsuffix -latest.osm.pbf,$(addprefix world/,$(WANTED_COUNTRIES)))

world/%.osm.pbf:
	mkdir -p $(@D)
	wget -nv -O $@ https://download.geofabrik.de/europe/$*.osm.pbf

filtered/%.osm.pbf: world/%.osm.pbf filter.params
	mkdir -p $(@D)
	osmium tags-filter --expressions=filter.params $< -o $@ --overwrite

output/filtered.osm.pbf: $(subst world,filtered,$(COUNTRIES_PBF))
	mkdir -p $(@D)
	osmium merge $^ -o $@ --overwrite

output/routing-ready: output/filtered.osm.pbf basic.lua
	osrm-extract -p basic.lua output/filtered.osm.pbf
	osrm-partition output/filtered.osrm
	osrm-customize output/filtered.osrm
	touch $@

all: output/routing-ready

serve: output/routing-ready
	osrm-routed --algorithm mld --max-viaroute-size 1000 output/filtered.osrm
