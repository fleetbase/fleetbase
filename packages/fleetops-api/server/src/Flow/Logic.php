<?php

namespace Fleetbase\FleetOps\Flow;

use Fleetbase\FleetOps\Models\Order;

class Logic extends FlowResource
{
    /**
     * Accessor method to retrieve the 'conditions' attribute.
     *
     * This method maps each condition in the 'conditions' attribute to a new Condition object.
     * It utilizes the array_map function to apply this transformation, ensuring each entry
     * in the conditions array is converted to a Condition object.
     *
     * @return array an array of Condition objects derived from the 'conditions' attribute
     */
    public function getConditionsAttribute(): array
    {
        return array_map(
            function ($condition) {
                return new Condition($condition);
            },
            $this->get('conditions', [])
        );
    }

    /**
     * Evaluates the logic conditions against an order.
     *
     * @param Order $order the order to evaluate the logic against
     *
     * @return bool whether the logic passes based on the order's attributes
     *
     * @throws \Exception if the logic type is unknown
     */
    public function passes(Order $order)
    {
        $logicType  = $this->type;
        $conditions = collect($this->conditions);

        switch ($logicType) {
            case 'and':
                // All conditions must be true
                return $conditions->every(fn ($condition) => $condition->eval($order));

            case 'or':
                // At least one condition must be true
                return $conditions->contains(fn ($condition) => $condition->eval($order));

            case 'not':
                // None of the conditions must be true
                return !$conditions->contains(fn ($condition) => $condition->eval($order));

            case 'if':
                // 'if' type logic can have multiple conditions; all must be true
                return $conditions->every(fn ($condition) => $condition->eval($order));

            default:
                throw new \Exception("Unknown logic type: {$logicType}");
        }
    }
}
