<?php

namespace Fleetbase\FleetOps\Imports;

use Fleetbase\FleetOps\Models\Place;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class PlaceImport implements ToCollection, WithHeadingRow
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

            Place::createFromImport($row, true);
        }
    }
}
