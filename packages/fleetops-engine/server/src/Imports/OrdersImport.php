<?php

namespace Fleetbase\FleetOps\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class OrdersImport implements ToCollection, WithHeadingRow
{
    /**
     * @return Collection
     */
    public function collection(Collection $rows)
    {
        return $rows;
    }
}
