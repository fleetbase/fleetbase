<?php

namespace Fleetbase\Http\Filter;

class NotificationFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where(function ($q) {
            $q->where('notifiable_id', $this->session->get('company'));
            $q->orWhere('notifiable_id', $this->session->get('user'));
        });
    }

    public function query(?string $query)
    {
        $this->builder->search($query);
    }

    public function unread(?bool $unread)
    {
        if ($unread) {
            $this->builder->whereNull('read_at');
        }
    }
}
