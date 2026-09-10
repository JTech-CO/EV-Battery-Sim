# Third-party notices

## About:Energy parameter material
The NMC111/graphite and LFP/graphite parameter subsets in `assets/data/cell-presets.json`, the hard-coded OCP/entropic functions derived from those parameterisations, and `assets/data/nmc-reference-1c.json` are adapted from the About:Energy BPX parameterisation material preserved by `JTech-CO/EV-Battery-Research`.

Original project: https://github.com/About-Energy-OpenSource/About-Energy-BPX-Parameterisation
License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
License text: https://creativecommons.org/licenses/by-sa/4.0/

Changes include field selection, renaming, JSON restructuring, safe hard-coded JavaScript function transcription, reduced-order use, and reference-curve packaging. Attribution, license link, and change notice must be retained. No endorsement by About:Energy is implied.

The source parameter headers describe mixed provenance: cycling/teardown-informed parameters, literature electrolyte/entropic properties, and estimated thermal properties. The simulator does not relabel all fields as measured quantities.

## U.S. EPA US06
`assets/data/us06.json` contains the US06 prescribed speed schedule transcribed from the U.S. Environmental Protection Agency source used by the research repository.

EPA source: https://www.epa.gov/system/files/other-files/2025-03/us06col.txt
Drive schedule page: https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules
EPA disclaimers/copyright: https://www.epa.gov/web-policies-and-procedures/epa-disclaimers

The trace is used as prescribed vehicle speed only. It is not presented as measured battery current or as EPA validation of this vehicle/battery model. EPA names/logos are not used as project branding.

## EV-Battery-Research
Research interpretation, provenance decisions, and data packaging are based on https://github.com/JTech-CO/EV-Battery-Research/. Preserve links to that project when redistributing adapted research assets.
