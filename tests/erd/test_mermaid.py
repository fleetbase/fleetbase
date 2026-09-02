import contextlib
import importlib.util
import io
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("fleetbase_mermaid", ROOT / "mermaid.py")
MERMAID = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MERMAID)


class DataType:
    def __init__(self, name):
        self.name = name


class Column:
    def __init__(self, name, data_type="VARCHAR", *, pk=False, fk=False, uk=False, remarks=None):
        self.name = name
        self.columnDataType = DataType(data_type)
        self._pk = pk
        self._fk = fk
        self._uk = uk
        self.remarks = remarks

    def isPartOfPrimaryKey(self):
        return self._pk

    def isPartOfForeignKey(self):
        return self._fk

    def isPartOfUniqueIndex(self):
        return self._uk

    def hasRemarks(self):
        return self.remarks is not None


class Table:
    def __init__(self, full_name, columns=None):
        self.fullName = full_name
        self.columns = columns or []
        self.referencingTables = []


class Catalog:
    def __init__(self, tables):
        self.tables = tables


def render(catalog):
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        MERMAID.render(catalog)
    return output.getvalue()


class MermaidRendererTest(unittest.TestCase):
    def test_sorts_tables_and_relationships_and_excludes_non_application_schemas(self):
        parent = Table("fleetbase.parents", [Column("id", pk=True)])
        child_b = Table("fleetbase.z_children", [Column("parent_uuid", fk=True)])
        child_a = Table("fleetbase.a_children", [Column("parent_uuid", fk=True)])
        sandbox = Table("fleetbase_sandbox.parents", [Column("id")])
        system = Table("mysql.users", [Column("Host")])
        parent.referencingTables = [child_b, sandbox, child_a, child_a]

        output = render(Catalog([child_b, system, parent, sandbox, child_a]))

        self.assertLess(output.index("fleetbase_a_children"), output.index("fleetbase_parents"))
        self.assertLess(output.index("fleetbase_parents"), output.index("fleetbase_z_children"))
        self.assertNotIn("sandbox", output)
        self.assertNotIn("mysql_users", output)
        self.assertEqual(output.count("fleetbase_parents ||--o{ fleetbase_a_children"), 1)
        self.assertLess(
            output.index("fleetbase_parents ||--o{ fleetbase_a_children"),
            output.index("fleetbase_parents ||--o{ fleetbase_z_children"),
        )

    def test_preserves_combined_keys_and_escapes_remarks(self):
        table = Table(
            "fleetbase.orders",
            [
                Column(
                    "customer-uuid",
                    "CHAR(36)",
                    pk=True,
                    fk=True,
                    uk=True,
                    remarks='Customer "identity"\npath\\value',
                )
            ],
        )

        output = render(Catalog([table]))

        self.assertIn("CHAR36 customeruuid PK, FK, UK", output)
        self.assertIn('"Customer \'identity\' path/value"', output)

    def test_rejects_normalized_table_name_collisions(self):
        catalog = Catalog([Table("foo-bar.users"), Table("foobar.users")])

        with self.assertRaisesRegex(ValueError, "both normalize to foobar_users"):
            render(catalog)

    def test_ignores_unqualified_names(self):
        output = render(Catalog([Table("users", [Column("id")])]))

        self.assertEqual(output, "erDiagram\n\n")


if __name__ == "__main__":
    unittest.main()
