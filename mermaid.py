from __future__ import print_function

import re


SYSTEM_SCHEMAS = {
    "information_schema",
    "mysql",
    "performance_schema",
    "sys",
}


def cleanname(name):
    """Return a Mermaid-safe identifier fragment."""
    return re.sub(r"[^\d\w_]", "", str(name))


def split_table_name(full_name):
    parts = str(full_name).split(".", 1)
    if len(parts) != 2:
        return None, None
    return parts[0], parts[1]


def format_table_name(full_name):
    schema, table = split_table_name(full_name)
    if not schema or not table:
        return None

    normalized_schema = schema.lower()
    if normalized_schema in SYSTEM_SCHEMAS or normalized_schema.endswith("_sandbox"):
        return None

    return cleanname(schema + "_" + table)


def format_remarks(remarks):
    """Collapse remarks to one safe Mermaid quoted string."""
    value = " ".join(str(remarks).split())
    return value.replace("\\", "/").replace('"', "'")


def column_markers(column):
    markers = []
    if column.isPartOfPrimaryKey():
        markers.append("PK")
    if column.isPartOfForeignKey():
        markers.append("FK")
    if column.isPartOfUniqueIndex():
        markers.append("UK")
    return markers


def included_tables(catalog):
    tables = [table for table in catalog.tables if format_table_name(table.fullName)]
    return sorted(tables, key=lambda table: str(table.fullName).lower())


def validate_unique_names(tables):
    names = {}
    for table in tables:
        formatted_name = format_table_name(table.fullName)
        previous = names.get(formatted_name)
        if previous is not None and previous != str(table.fullName):
            raise ValueError(
                "Table names %s and %s both normalize to %s"
                % (previous, table.fullName, formatted_name)
            )
        names[formatted_name] = str(table.fullName)


def render(catalog):
    tables = included_tables(catalog)
    validate_unique_names(tables)
    included_full_names = {str(table.fullName) for table in tables}

    print("erDiagram")
    print("")

    for table in tables:
        print("  " + format_table_name(table.fullName) + " {")
        for column in table.columns:
            line = "    %s %s" % (
                cleanname(column.columnDataType.name),
                cleanname(column.name),
            )

            markers = column_markers(column)
            if markers:
                line += " " + ", ".join(markers)

            if column.hasRemarks():
                line += ' "' + format_remarks(column.remarks) + '"'

            print(line)
        print("  }")
        print("")

    relationships = set()
    for table in tables:
        for child_table in table.referencingTables:
            if str(child_table.fullName) not in included_full_names:
                continue
            relationships.add(
                (
                    format_table_name(table.fullName),
                    format_table_name(child_table.fullName),
                )
            )

    for parent_name, child_name in sorted(relationships):
        print(
            '  %s ||--o{ %s : "foreign key"'
            % (parent_name, child_name)
        )


# SchemaCrawler injects `catalog` into the script global namespace.
if "catalog" in globals():
    render(catalog)
