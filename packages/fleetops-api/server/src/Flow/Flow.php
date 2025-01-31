<?php

namespace Fleetbase\FleetOps\Flow;

class Flow extends FlowResource implements \IteratorAggregate
{
    /**
     * Returns an iterator for the flow.
     *
     * @return \Traversable an iterator for the flow's activities
     */
    public function getIterator(): \Traversable
    {
        foreach ($this->attributes['activities'] as $activityAttributes) {
            yield new Activity($activityAttributes, $this->serialize());
        }
    }

    /**
     * Retrieve the activity for a given code.
     *
     * @param string $code the unique code identifier for the activity
     *
     * @return Activity|null the Activity object if found, or null otherwise
     */
    public function getActivity(string $code): ?Activity
    {
        if (isset($this->{$code})) {
            return new Activity($this->{$code}, $this->serialize());
        }

        return null;
    }

    /**
     * Determines if a given object is an instance of Activity.
     *
     * This static method is used to check if a provided object is an
     * instance of the Activity class. This can be useful in contexts where
     * there is a need to verify the type of a given resource or object.
     *
     * @param mixed $activity the object to check
     *
     * @return bool returns true if the provided object is an instance of Activity, false otherwise
     */
    public static function isActivity($activity)
    {
        return $activity instanceof Activity;
    }
}
