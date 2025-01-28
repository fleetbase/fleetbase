<?php

namespace Fleetbase\FleetOps\Flow;

use Fleetbase\FleetOps\Models\Order;
use Illuminate\Support\Str;

class Condition extends FlowResource
{
    /**
     * Evaluate the condition against an order.
     *
     * @param Order $order the order to evaluate the condition against
     *
     * @return bool the result of the condition evaluation
     *
     * @throws \Exception if the operator is unknown
     */
    public function eval(Order $order)
    {
        $field       = $this->field;
        $operator    = $this->operator;
        $value       = $this->value;
        $actualValue = strtolower($order->resolveDynamicValue($field));

        // if value is string convert to lowercase
        if (is_string($value)) {
            $value = strtolower($value);
        }

        switch ($operator) {
            case 'exists':
                return isset($actualValue);

            case 'in':
            case 'has':
                return is_array($actualValue) && in_array($actualValue, $value);

            case 'notIn':
            case 'doesntHave':
                return is_array($actualValue) && !in_array($actualValue, $value);

            case 'contains':
                return is_string($value) && is_string($actualValue) && Str::contains($value, $actualValue);

            case 'beginsWith':
                return is_string($value) && is_string($actualValue) && Str::startsWith($value, $actualValue);

            case 'endsWith':
                return is_string($value) && is_string($actualValue) && Str::endsWith($value, $actualValue);

            case 'equal':
                return $actualValue == $value;

            case 'and':
                return $actualValue && $value;

            case 'or':
                return $actualValue || $value;

            case 'not':
                return !$actualValue;

            case 'notEqual':
                return $actualValue != $value;

            case 'greaterThan':
                return $actualValue > $value;

            case 'greaterThanOrEqual':
                return $actualValue >= $value;

            case 'lessThan':
                return $actualValue < $value;

            case 'lessThanOrEqual':
                return $actualValue <= $value;

                // ... and so on for the other operators
            default:
                throw new \Exception("Unknown operator: {$operator}");
        }
    }
}
