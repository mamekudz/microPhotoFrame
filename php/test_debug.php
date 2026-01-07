<?php
header('Content-Type: application/json');

$debug = [
    'QUERY_STRING' => isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : 'NOT SET',
    'REQUEST_URI' => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : 'NOT SET',
    'REQUEST_METHOD' => isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'NOT SET',
    'GET' => $_GET,
    'POST' => $_POST,
    'POST_RAW' => file_get_contents('php://input'),
    'SERVER' => [
        'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'],
        'SCRIPT_FILENAME' => $_SERVER['SCRIPT_FILENAME'],
        'PHP_SELF' => $_SERVER['PHP_SELF']
    ]
];

echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
