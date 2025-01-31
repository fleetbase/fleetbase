<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Mail\CustomerCredentialsMail;
use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class CustomerController extends Controller
{
    /**
     * Resets the password for a specified customer and optionally sends the new credentials via email.
     *
     * This method handles the process of resetting a customer's password. It performs the following actions:
     * 1. Validates the presence of the customer identifier.
     * 2. Ensures that the provided password and confirmation password match.
     * 3. Retrieves the customer based on the provided UUID, company session, and customer type.
     * 4. Loads the associated user account or creates one if it doesn't exist.
     * 5. Updates the user's password.
     * 6. Optionally sends the new password to the customer's email address if opted in.
     *
     * **Usage Example:**
     * ```php
     * // In a controller method
     * public function someControllerMethod(Request $request)
     * {
     *     return $this->resetPassword($request);
     * }
     * ```
     *
     * **Request Parameters:**
     * - `customer` (string): The UUID of the customer whose password is to be reset.
     * - `password` (string): The new password for the customer.
     * - `password_confirmation` (string): Confirmation of the new password.
     * - `send_credentials` (boolean): Flag indicating whether to send the new credentials via email.
     *
     * **Response:**
     * - On success: Returns a JSON response with `['status' => 'ok']`.
     * - On failure: Returns a JSON error response with an appropriate error message.
     *
     * **Possible Error Responses:**
     * - `'No customer specified to change password for.'`
     * - `'Passwords do not match.'`
     * - `'Customer not found to change password for.'`
     * - `'Unable to reset customer credentials.'`
     *
     * @param Request $request the HTTP request instance containing input data
     *
     * @return \Illuminate\Http\JsonResponse a JSON response indicating the result of the password reset operation
     *
     * @throws \Illuminate\Validation\ValidationException if validation fails
     * @throws \Exception                                 if unexpected errors occur during the password reset process
     *
     * @see \Fleetbase\FleetOps\\Models\Contact
     * @see \Fleetbase\FleetOps\\Mail\CustomerCredentialsMail
     */
    public function resetCredentials(Request $request)
    {
        $customerId      = $request->input('customer');
        $password        = $request->input('password');
        $confirmPassword = $request->input('password_confirmation');
        $sendCredentials = $request->boolean('send_credentials');

        if (!$customerId) {
            return response()->error('No customer specified to change password for.');
        }

        if ($password !== $confirmPassword) {
            return response()->error('Passwords do not match.');
        }

        $customer = Contact::where(['uuid' => $customerId, 'company_uuid' => session('company'), 'type' => 'customer'])->first();
        if (!$customer) {
            return response()->error('Customer not found to change password for.');
        }

        // Load customer user
        $user = $customer->user_uuid ? User::where('uuid', $customer->user_uuid)->first() : $customer->createUser();
        if (!$user) {
            return response()->error('Unable to reset customer credentials');
        }

        // Change password
        $user->changePassword($password);

        // Send credentials to customer if opted
        if ($sendCredentials) {
            Mail::to($user)->send(new CustomerCredentialsMail($password, $customer));
        }

        return response()->json(['status' => 'ok']);
    }
}
