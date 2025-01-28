<?php

namespace Fleetbase\Http\Filter;

class FileFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function queryForPublic()
    {
        $this->queryForInternal();
    }

    public function typeEndsWith($type)
    {
        $this->builder->where('type', 'LIKE', '%-' . $type);
    }

    public function typeStartsWith($type)
    {
        $this->builder->where('type', 'LIKE', $type . '-%');
    }
}
