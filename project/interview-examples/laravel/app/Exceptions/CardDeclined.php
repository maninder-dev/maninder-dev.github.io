<?php

namespace App\Exceptions;

use RuntimeException;

/** Topics 73 / 82: thrown by a PaymentGateway when the charge fails. */
class CardDeclined extends RuntimeException {}
