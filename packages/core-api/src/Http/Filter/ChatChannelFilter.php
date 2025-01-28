<?php

namespace Fleetbase\Http\Filter;

class ChatChannelFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder
            ->where('company_uuid', $this->session->get('company'))
            ->whereHas('participants', function ($query) {
                $query->where('user_uuid', $this->session->get('user'));
            });
    }

    public function queryForPublic()
    {
        $this->queryForInternal();
    }

    public function query(?string $query)
    {
        $this->builder->search($query);
    }
}
