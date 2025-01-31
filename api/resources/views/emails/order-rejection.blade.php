<!DOCTYPE html>
<html>
<head>
    <title>Order Rejection Notification</title>
</head>
<body>
    <h1>Order Rejection Notification</h1>
    
    <p>This is to inform you that an order has been rejected by the assigned driver.</p>
    
    <h2>Order Details:</h2>
    <ul>
        <li>Order ID: {{ $orderData['public_id'] }}</li>
    </ul>
    
    <h2>Driver Details:</h2>
    <ul>
        <li>Name: {{ $driverDetails['name'] }}</li>
        <li>ID: {{ $driverDetails['public_id'] }}</li>
        <li>Phone: {{ $driverDetails['phone'] }}</li>
    </ul>
    
    <p>The order has been returned to the unassigned order list and is available for reassignment.</p>
    
    <p>Please take necessary action to reassign this order.</p>
    
    <p>Best regards,<br>
    FleetYes</p>
</body>
</html>