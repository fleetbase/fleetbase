<?php

namespace Fleetbase\FleetOps\Imports;

use Fleetbase\FleetOps\Models\Fleet;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class FleetImport implements ToCollection, WithHeadingRow
{
    /**
     * @return Collection
     */
    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            if ($row instanceof Collection) {
                $row = array_filter($row->toArray());
            }

            Fleet::createFromImport($row, true);
        }
    }
}
