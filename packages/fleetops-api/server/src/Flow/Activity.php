<?php

namespace Fleetbase\FleetOps\Flow;

use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\Utils;

class Activity extends FlowResource
{
    /**
     * The Flow context for the activity.
     */
    public Flow $flow;

    /**
     * Create a new Activity instance.
     *
     * @param array $attributes initial attributes of the activity
     * @param array $flow       the flow configuration for this activity
     */
    public function __construct(array $attributes = [], array $flow = [])
    {
        parent::__construct($attributes);
        $this->flow = new Flow($flow);
    }

    /**
     * Retrieves the logic attribute of the Activity.
     *
     * @return array an array of Logic instances associated with the Activity
     */
    public function getLogicAttribute(): array
    {
        return array_map(
            function ($logic) {
                return new Logic($logic);
            },
            $this->get('logic', [])
        );
    }

    /**
     * Retrieves the events attribute of the Activity.
     *
     * @return array an array of Event instances associated with the Activity
     */
    public function getEventsAttribute(): array
    {
        return array_map(
            function ($eventName) {
                return new Event($eventName);
            },
            $this->get('events', [])
        );
    }

    /**
     * Determines if the Activity passes based on the provided Order.
     *
     * @param Order $order the order to evaluate against the Activity's logic
     *
     * @return bool true if all the logic associated with the Activity passes; False otherwise
     */
    public function passes(Order $order)
    {
        $logicCollection = collect($this->logic);

        return $logicCollection->every(function ($logic) use ($order) {
            $conditionCollection = collect($logic->conditions);

            switch ($logic->type) {
                case 'and':
                    // All conditions must be true
                    return $conditionCollection->every(fn ($condition) => $condition->eval($order));

                case 'or':
                    // At least one condition must be true
                    return $conditionCollection->contains(fn ($condition) => $condition->eval($order));

                case 'not':
                    // None of the conditions must be true (assuming 'not' can have multiple conditions)
                    return !$conditionCollection->contains(fn ($condition) => $condition->eval($order));

                case 'if':
                    // Only one condition in 'if', and it must be true (typically, 'if' has only one condition)
                    return $conditionCollection->first()->eval($order);

                default:
                    // Unrecognized logic type
                    throw new \Exception("Unsupported logic type '{$logic->type}' provided.");
            }
        });
    }

    /**
     * Fires a series of events associated with an order.
     *
     * Iterates over the events array and triggers each event, passing the order as a parameter.
     * This function is typically used to execute a sequence of events as part of a workflow process.
     *
     * @param Order $order the order object to be passed to each event
     */
    public function fireEvents(Order $order)
    {
        foreach ($this->events as $event) {
            $event->fire($order);
        }
    }

    /**
     * Retrieves the child activities of this Activity.
     *
     * @return \Illuminate\Support\Collection a collection of child activities
     */
    public function getChildActivities()
    {
        $children = collect();
        if (is_array($this->activities)) {
            foreach ($this->activities as $childActivityCode) {
                $childActivity = $this->flow->getActivity($childActivityCode);
                if ($childActivity) {
                    $children->push($childActivity);
                }
            }
        }

        return $children;
    }

    /**
     * Retrieves the children activities of this Activity.
     *
     * This is a shorthand method for `getChildActivities`.
     *
     * @return \Illuminate\Support\Collection the collection of child activities
     */
    public function children()
    {
        return $this->getChildActivities();
    }

    /**
     * Checks whether this Activity has a child activity with a specified code.
     *
     * @param string $code the unique code identifier for the child activity
     *
     * @return bool true if the child activity is found; otherwise, False
     */
    public function hasChildActivity(string $code)
    {
        return $this->children()->contains(
            function ($activity) use ($code) {
                return $activity->code === $code;
            }
        );
    }

    /**
     * Determines the next set of activities based on the provided Order.
     *
     * @param Order $order the order to determine the next activities for
     *
     * @return \Illuminate\Support\Collection a collection of the next activities
     */
    public function getNext(Order $order)
    {
        $children       = $this->getChildActivities();
        $nextActivities = collect();

        foreach ($children as $childActivity) {
            if ($childActivity->passes($order)) {
                $nextActivities->push($childActivity);
            }
        }

        return $nextActivities;
    }

    /**
     * Retrieves the previous activities of this Activity in the Flow.
     *
     * This method iterates over the flow to find activities that list this Activity as a child.
     *
     * @return \Illuminate\Support\Collection a collection of previous activities
     */
    public function getPrevious()
    {
        $previous = collect();
        foreach ($this->flow as $activity) {
            if ($activity->hasChildActivity($this->code)) {
                $previous->push($activity);
            }
        }

        return $previous;
    }

    /**
     * Checks if the activity's code matches a specified code.
     *
     * This method is used to determine if the current activity instance
     * has a specific code, which is useful for identifying the activity.
     *
     * @param string $code the code to compare against the activity's code
     *
     * @return bool returns true if the activity's code matches the specified code, false otherwise
     */
    public function is(string $code)
    {
        return $this->code === $code;
    }

    /**
     * Determines if the activity is marked as complete.
     *
     * This method checks the 'complete' property of the activity. It's typically used
     * to verify if the activity has been completed as part of the workflow process.
     *
     * @return bool returns true if the activity is marked as complete, false otherwise
     */
    public function complete(): bool
    {
        return Utils::isTrue($this->complete);
    }

    /**
     * Checks if completing this activity leads to the completion of the order.
     *
     * This method uses the `complete` method to determine if the completion of
     * this activity signifies the completion of the associated order. It is useful
     * for workflows where the finalization of an activity concludes the entire order process.
     *
     * @return bool returns true if completing this activity completes the order, false otherwise
     */
    public function completesOrder(): bool
    {
        return $this->complete();
    }

    public function isCompleted(Order $order): bool
    {
        return $order->hasCompletedActivity($this);
    }
}
