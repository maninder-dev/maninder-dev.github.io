<?php

namespace App\Exceptions;

use RuntimeException;

/** Topic 24: listed in dontReport(), so it never reaches the logs. */
class CouponExpired extends RuntimeException {}
