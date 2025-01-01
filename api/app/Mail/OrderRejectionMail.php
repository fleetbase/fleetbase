<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderRejectionMail extends Mailable
{
    use Queueable, SerializesModels;

    public $orderData;
    public $driverDetails;

    /**
     * Create a new message instance
     *
     * @param array $orderData
     * @param array $driverDetails
     */
    public function __construct($orderData, $driverDetails)
    {
        $this->orderData = $orderData;
        $this->driverDetails = $driverDetails;
    }

    /**
     * Build the message
     *
     * @return $this
     */
    public function build()
    {
        return $this->view('emails.order-rejection')
                    ->subject('Order Rejection by Driver Notification')
                    ->with([
                        'orderData' => $this->orderData,
                        'driverDetails' => $this->driverDetails
                    ]);
    }
}