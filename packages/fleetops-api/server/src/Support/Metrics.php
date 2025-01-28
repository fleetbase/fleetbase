<?php

namespace Fleetbase\FleetOps\Support;

use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\FuelReport;
use Fleetbase\FleetOps\Models\Issue;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\Models\Company;
use Fleetbase\Models\Transaction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Metrics service to pull analyitcs and metrics from FleetOps.
 *
 * Ex:
 * $metrics = Metrics::new($company)->withEarnings()->withFuelCosts()->get();
 */
class Metrics
{
    protected \DateTime $start;
    protected \DateTime $end;
    protected Company $company;
    protected array $metrics = [];

    public static function new(Company $company, ?\DateTime $start = null, ?\DateTime $end = null): Metrics
    {
        $start = $start === null ? Carbon::create(1900)->toDateTime() : $start;
        $end   = $end === null ? Carbon::tomorrow()->toDateTime() : $end;

        return (new static())->setCompany($company)->between($start, $end);
    }

    public static function forCompany(Company $company, ?\DateTime $start = null, ?\DateTime $end = null): Metrics
    {
        return static::new($company, $start, $end);
    }

    public function start(\DateTime $start): Metrics
    {
        $this->start = $start;

        return $this;
    }

    public function end(\DateTime $end): Metrics
    {
        $this->end = $end;

        return $this;
    }

    public function between(\DateTime $start, \DateTime $end): Metrics
    {
        return $this->start($start)->end($end);
    }

    private function setCompany(Company $company): Metrics
    {
        $this->company = $company;

        return $this;
    }

    private function set($key, $value = null): Metrics
    {
        if (is_array($key)) {
            foreach ($key as $k => $v) {
                $this->set($k, $v);
            }

            return $this;
        }

        $this->metrics = data_set($this->metrics, $key, $value);

        return $this;
    }

    public function get()
    {
        return $this->metrics;
    }

    public function with(?array $metrics = [])
    {
        if (empty($metrics)) {
            $metrics = array_slice(get_class_methods($this), 9);
        }

        $metrics = array_map(
            function ($metric) {
                return Str::camel($metric);
            },
            $metrics
        );

        foreach ($metrics as $metric) {
            if (method_exists($this, $metric)) {
                $this->{$metric}();
            }
        }

        return $this;
    }

    public function earnings(?callable $callback = null): Metrics
    {
        $query = Transaction::where('company_uuid', $this->company->uuid)->whereBetween('created_at', [$this->start, $this->end]);

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->sum('amount');

        return $this->set('earnings', (int) $data);
    }

    public function fuelCosts(?callable $callback = null): Metrics
    {
        $query = FuelReport::where('company_uuid', $this->company->uuid)->whereBetween('created_at', [$this->start, $this->end]);

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->sum('amount');

        return $this->set('fuel_costs', (int) $data);
    }

    public function totalDistanceTraveled(?callable $callback = null): Metrics
    {
        $query = Order::where(
            [
                'company_uuid' => $this->company->uuid,
                'status'       => 'completed',
            ]
        )
            ->whereBetween('created_at', [$this->start, $this->end]);

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->sum('distance');

        return $this->set('total_distance_traveled', (int) $data);
    }

    public function totalTimeTraveled(?callable $callback = null): Metrics
    {
        $query = Order::where(
            [
                'company_uuid' => $this->company->uuid,
                'status'       => 'completed',
            ]
        )
            ->whereBetween('created_at', [$this->start, $this->end]);

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->sum('distance');

        return $this->set('total_distance_traveled', (int) $data);
    }

    public function ordersCanceled(?callable $callback = null): Metrics
    {
        $query = Order::where('company_uuid', $this->company->uuid)
            ->whereBetween('created_at', [$this->start, $this->end])
            ->where('status', 'canceled');

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('orders_canceled', $data);
    }

    public function ordersCompleted(?callable $callback = null): Metrics
    {
        $query = Order::where('company_uuid', $this->company->uuid)
            ->whereBetween('created_at', [$this->start, $this->end])
            ->where('status', 'completed');

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('orders_completed', $data);
    }

    public function ordersInProgress(?callable $callback = null): Metrics
    {
        $query = Order::where('company_uuid', $this->company->uuid)
            ->whereBetween('created_at', [$this->start, $this->end])
            ->whereNotIn('status', ['completed', 'created', 'pending', 'canceled']);

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('orders_in_progress', $data);
    }

    public function ordersScheduled(?callable $callback = null): Metrics
    {
        $query = Order::where('company_uuid', $this->company->uuid)
            ->whereBetween('created_at', [$this->start, $this->end])
            ->where('status', 'created')
            ->whereDate('scheduled_at', '>', Carbon::now());

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('orders_scheduled', $data);
    }

    public function driversOnline(?callable $callback = null): Metrics
    {
        $query = Driver::where('company_uuid', $this->company->uuid)
            ->where('online', true)
            ->whereNotNull('current_job_uuid');

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('drivers_online', $data);
    }

    public function totalDrivers(?callable $callback = null): Metrics
    {
        $query = Driver::where('company_uuid', $this->company->uuid);

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('total_drivers', $data);
    }

    public function totalCustomers(?callable $callback = null): Metrics
    {
        $query = Contact::where('company_uuid', $this->company->uuid)
            ->where('type', 'customer');

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('total_customers', $data);
    }

    public function openIssues(?callable $callback = null): Metrics
    {
        $query = Issue::where('company_uuid', session('company'))
            ->whereBetween('created_at', [$this->start, $this->end])
            ->where('status', 'pending');

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('open_issues', $data);
    }

    public function resolvedIssues(?callable $callback = null): Metrics
    {
        $query = Issue::where('company_uuid', session('company'))
            ->whereBetween('created_at', [$this->start, $this->end])
            ->whereNotNull('resolved_at');

        if (is_callable($callback)) {
            $callback($query);
        }

        $data = $query->count();

        return $this->set('resolved_issues', $data);
    }
}
