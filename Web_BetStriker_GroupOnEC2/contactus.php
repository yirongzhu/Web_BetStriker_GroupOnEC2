<?php

$name = $_POST['name'];
$email = $_POST['email'];
$message = $_POST['message'];
$name = $_POST['name'];
$to = "aalenizi@email.arizona.edu";
$subject = "New Message";
mail($to, $subject, $message, "From: " . $name);
echo "Your message has been sent. Now, let's play some soccer!";

?>