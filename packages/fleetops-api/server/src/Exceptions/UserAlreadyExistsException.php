<?php

namespace Fleetbase\FleetOps\Exceptions;

use Fleetbase\Models\User;

/**
 * Class UserAlreadyExistsException.
 *
 * Exception thrown when attempting to create or register a user that already exists in the system.
 *
 * This exception provides additional context by including the existing user object, allowing
 * developers to access details about the duplicate user that triggered the exception.
 */
class UserAlreadyExistsException extends \Exception
{
    /**
     * The user that already exists in the system.
     */
    private ?User $user;

    /**
     * UserAlreadyExistsException constructor.
     *
     * Initializes a new instance of the UserAlreadyExistsException.
     *
     * @param string          $message  the exception message describing the error
     * @param User|null       $user     The existing user that caused the exception. Optional.
     * @param int             $code     The exception code. Default is 0.
     * @param \Throwable|null $previous The previous throwable used for exception chaining. Optional.
     */
    public function __construct(string $message = '', ?User $user = null, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->user = $user;
    }

    /**
     * Retrieves the user that already exists.
     *
     * This method returns the `User` instance that triggered the exception, providing access
     * to the user's details such as ID, name, email, etc.
     *
     * @return User|null the existing user object, or null if not provided
     */
    public function getUser(): ?User
    {
        return $this->user;
    }
}
