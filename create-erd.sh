#!/bin/bash

# Exit the script as soon as a command fails
set -e

# Run schemacrawler
# To use schemacrawler see https://www.schemacrawler.com/downloads.html
schemacrawler.sh --server mysql --host localhost --database fleetbase --user root --info-level standard --command script --script-language python --script mermaid.py --output-file database.mmd
schemacrawler.sh --server mysql --host localhost --database fleetbase --user root --info-level standard --command=schema --grep-tables="^(?!fleetbase_sandbox\.).*" --output-format=svg --output-file=erd.svg

# Generate a SVG ERD diagram using `dark` theme
# To use mmdc see https://github.com/mermaid-js/mermaid-cli
mmdc -i database.mmd -o erd-dark.svg -t dark -b transparent --configFile="mmdc.json"