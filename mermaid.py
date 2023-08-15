from __future__ import print_function
import re

def cleanname(name):
    return re.sub(r'[^\d\w_]', '', name)

def format_table_name(full_name):
    parts = full_name.split('.')
    if len(parts) == 2 and not parts[0].endswith('_sandbox'):
        return cleanname(parts[0] + '_' + parts[1])
    else:
        return None

print('erDiagram')
print('')
for table in catalog.tables:
    formatted_name = format_table_name(table.fullName)
    if formatted_name:
        print('  ' + formatted_name + ' {')
        for column in table.columns:
            print('    ' + cleanname(column.columnDataType.name) + ' ' + cleanname(column.name),
                  end='')
            if column.isPartOfPrimaryKey():
                print(' PK', end='')
            elif column.isPartOfForeignKey():
                print(' FK', end='')
            elif column.isPartOfUniqueIndex():
                print(' UK', end='')
            if column.hasRemarks():
                print(' "' + ' '.join(column.remarks.splitlines()) + '"',
                      end='')
            print()
        print('  }')
        print('')

for table in catalog.tables:
    formatted_name = format_table_name(table.fullName)
    if formatted_name:
        for childTable in table.referencingTables:
            child_formatted_name = format_table_name(childTable.fullName)
            if child_formatted_name:
                print('  ' + formatted_name + ' ||--o{ ' +
                      child_formatted_name + ' : "foreign key"')
