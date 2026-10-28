<?php
// =========================================
// µPhotoFrame™.php
// © 2026 Meinolf Amekudzi
// (published under MIT license)
// =========================================

// Increase limits for large file uploads
ini_set('upload_max_filesize', '500M');
ini_set('post_max_size', '500M');
ini_set('max_execution_time', 3600);
ini_set('memory_limit', '512M');

// Disable error reporting to prevent output before JSON
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Start output buffering to catch any accidental output
ob_start();

// Schwerwiegende Laufzeitfehler für spätere Analyse in logs/php_fatal.log (nicht im JSON-API-Output)
$__mpfLogDir = __DIR__ . '/../logs';
$__mpfFatalLog = $__mpfLogDir . '/php_fatal.log';
if (!is_dir($__mpfLogDir)) {
    @mkdir($__mpfLogDir, 0755, true);
}
set_exception_handler(function ($e) use ($__mpfFatalLog) {
    @file_put_contents($__mpfFatalLog, date('c') . ' EX ' . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n\n", FILE_APPEND | LOCK_EX);
});
register_shutdown_function(function () use ($__mpfFatalLog) {
    $e = error_get_last();
    if ($e && in_array((int) $e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        @file_put_contents($__mpfFatalLog, date('c') . ' FATAL ' . $e['message'] . ' in ' . $e['file'] . ':' . $e['line'] . "\n\n", FILE_APPEND | LOCK_EX);
    }
});

// Check if this is an API request
// API request if:
// 1. Has 'action' in query string, OR
// 2. Has POST body (which might contain action), OR
// 3. Has 'route' parameter (for SPA routing - serve index.html)

// Check query string for action FIRST (before reading POST body)
// Read QUERY_STRING directly from $_SERVER to catch action even if $_GET is not populated
$queryString = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
// Check $_GET directly first (should be populated by Apache)
$hasActionInQuery = isset($_GET['action']) && !empty($_GET['action']);
// Also check query string directly with strpos (simpler and more reliable)
$hasActionInQueryString = !empty($queryString) && (strpos($queryString, 'action=') !== false);
$route = isset($_GET['route']) ? $_GET['route'] : null;

// DEBUG: Log what we see (remove after debugging)
// error_log("microPhotoFrame.php: QUERY_STRING='$queryString', hasActionInQuery=" . ($hasActionInQuery ? 'true' : 'false') . ", hasActionInQueryString=" . ($hasActionInQueryString ? 'true' : 'false'));

// CRITICAL: If we have action in query string OR in $_GET, this is definitely an API request
// Force API request - skip index.html serving
if ($hasActionInQuery || $hasActionInQueryString) {
    // Force API request - skip index.html serving
    $isApiRequest = true;
    $rawInput = file_get_contents('php://input');
    // Jump directly to API logic (skip the else block below)
    goto api_logic;
} else {
    // Read POST body (we need to read it once and reuse it)
    $rawInput = file_get_contents('php://input');
    $hasPostBody = !empty($rawInput);
    $hasActionInPost = false;

    // Check if POST body contains action
    if ($hasPostBody) {
        $jsonInput = json_decode($rawInput, true);
        if ($jsonInput !== null && isset($jsonInput['action']) && !empty($jsonInput['action'])) {
            $hasActionInPost = true;
        }
    }

    // If this is NOT an API request (no action in query, no action in POST, and no route), serve index.html
    if (!$hasActionInPost && $route === null) {
        // Serve index.html
        $indexPath = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'index.html';
        if (file_exists($indexPath)) {
            // Clean output buffer
            while (ob_get_level()) {
                ob_end_clean();
            }
            // Set HTML headers
            header('Content-Type: text/html; charset=UTF-8');
            header('X-UA-Compatible: IE=edge');
            header('X-Frame-Options: SAMEORIGIN');
            header('X-Content-Type-Options: nosniff');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            // Read and output index.html
            readfile($indexPath);
            exit(0);
        }
    }
}

// If route parameter is set (for SPA routing), serve index.html
if ($route !== null && !$hasActionInQuery) {
    $indexPath = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'index.html';
    if (file_exists($indexPath)) {
        // Clean output buffer
        while (ob_get_level()) {
            ob_end_clean();
        }
        // Set HTML headers
        header('Content-Type: text/html; charset=UTF-8');
        header('X-UA-Compatible: IE=edge');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        // Read and output index.html
        readfile($indexPath);
        exit(0);
    }
}

api_logic:
// This is an API request - set JSON headers
header('Content-Type: application/json');
header('X-UA-Compatible: IE=edge');
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');

// Get action from query string or POST body
// Reuse $rawInput if already read above
if (!isset($rawInput)) {
    $rawInput = file_get_contents('php://input');
}

$action = isset($_GET['action']) ? $_GET['action'] : null;
if (!$action && isset($_POST['action'])) {
    $action = $_POST['action'];
}
// Also check if action is in JSON body
if (!$action && !empty($rawInput)) {
    $jsonInput = json_decode($rawInput, true);
    if ($jsonInput && isset($jsonInput['action'])) {
        $action = $jsonInput['action'];
    }
}

// Get input from POST body (JSON) - reuse $rawInput if already read
$input = [];
if (!empty($rawInput)) {
    if (!isset($jsonInput)) {
        $jsonInput = json_decode($rawInput, true);
    }
    if ($jsonInput && isset($jsonInput['input'])) {
        $input = $jsonInput['input'];
    }
}

// Initialize response object
$rest = [
    'action' => $action,
    'input' => $input,
    'output' => [],
    'ok' => false,
    'error' => ['msg' => '', 'code' => 0]
];

// Parse POST body if present
$requestBody = file_get_contents('php://input');
if (!empty($requestBody)) {
    $parsedBody = json_decode($requestBody, true);
    if ($parsedBody !== null) {
        if (isset($parsedBody['input'])) {
            $rest['input'] = $parsedBody['input'];
        }
        if (isset($parsedBody['action'])) {
            $rest['action'] = $parsedBody['action'];
            $action = $parsedBody['action'];
        }
    }
}

// Helper functions
function dataUrlMimeType($dataUrl) {
    $parts = explode(';', $dataUrl);
    $mimeParts = explode(':', $parts[0]);
    return strtolower($mimeParts[1]);
}

function dataUrlData($dataUrl) {
    $parts = explode(',', $dataUrl);
    return $parts[1];
}

function pathCorrection($path) {
    $basePath = dirname(__DIR__) . DIRECTORY_SEPARATOR;
    if (strpos($path, ':') === 1) {
        // Absolute Windows path
        $path = str_replace('/', DIRECTORY_SEPARATOR, $path);
        if (strpos($path, $basePath) !== 0) {
            return null; // Security: path outside base directory
        }
        return $path;
    } else {
        // Relative path
        if (substr($path, 0, 2) === './') {
            $path = substr($path, 2);
        }
        return $basePath . str_replace('/', DIRECTORY_SEPARATOR, $path);
    }
}

function isValidDirectoryName($name) {
    if (empty($name) || trim($name) === '') {
        return false;
    }
    $invalidChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    foreach ($invalidChars as $char) {
        if (strpos($name, $char) !== false) {
            return false;
        }
    }
    return true;
}

function getSafeShowName($givenName) {
    if (empty($givenName)) {
        return 'show_unknown';
    }
    $safeName = preg_replace('/[^a-zA-Z0-9\-_.]/', '_', $givenName);
    $safeName = preg_replace('/\.{2,}/', '.', $safeName);
    $safeName = trim($safeName, '._');
    if ($safeName === '' || strpos($safeName, '..') !== false) {
        return 'show_unknown';
    }
    return 'show_' . $safeName;
}

function displaySlugForId($displayId) {
    static $map = null;
    $key = trim((string)$displayId);
    if ($key === '') return '';
    if ($map === null) {
        $raw = @file_get_contents(__DIR__ . '/../src/microLib/display-slugs.json');
        $map = $raw ? json_decode($raw, true) : [];
        if (!is_array($map)) $map = [];
    }
    return isset($map[$key]) ? $map[$key] : $key;
}

function resolveReadyShowPath($rawUrl) {
    $rel = str_replace('\\', '/', trim((string)$rawUrl));
    $rel = ltrim($rel, '/');
    if (strpos($rel, 'readyToGoShows/') === 0) $rel = substr($rel, strlen('readyToGoShows/'));
    if ($rel === '' || strpos($rel, '..') !== false) return null;
    $root = realpath(__DIR__ . '/../readyToGoShows');
    if ($root === false) return null;
    $abs = realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
    if ($abs === false) return null;
    if ($abs !== $root && strpos($abs, $root . DIRECTORY_SEPARATOR) !== 0) return null;
    return $abs;
}

function listReadyShows(&$rest) {
    $catalogs = [];
    $root = __DIR__ . '/../readyToGoShows';
    if (is_dir($root)) {
        foreach (scandir($root) as $name) {
            if ($name === '.' || $name === '..') continue;
            $json = $root . DIRECTORY_SEPARATOR . $name . DIRECTORY_SEPARATOR . $name . '_orgimgs.json';
            if (!is_file($json)) continue;
            $title = $name;
            $count = 0;
            $cat = @json_decode(@file_get_contents($json), true);
            if (is_array($cat)) {
                if (!empty($cat['name'])) $title = $cat['name'];
                if (!empty($cat['images']) && is_array($cat['images'])) $count = count($cat['images']);
            }
            $catalogs[] = [
                'name' => $name,
                'title' => $title,
                'count' => $count,
                'path' => 'readyToGoShows/' . $name . '/' . $name . '_orgimgs.json'
            ];
        }
    }
    $rest['output']['catalogs'] = $catalogs;
    $rest['ok'] = true;
}

function fetchShowSource(&$rest) {
    $raw = isset($rest['input']['url']) ? trim((string)$rest['input']['url']) : '';
    $name = isset($rest['input']['name']) ? preg_replace('/[^a-zA-Z0-9\-_]/', '_', (string)$rest['input']['name']) : 'image';
    if ($name === '') $name = 'image';
    if ($raw === '') {
        $rest['ok'] = false;
        $rest['error']['msg'] = 'url fehlt';
        return;
    }
    $mime = 'image/jpeg';
    $ext = '.jpg';
    if (preg_match('#^https?://#i', $raw)) {
        $ctx = stream_context_create([
            'http' => [
                'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) microPhotoFrame/1.5\r\nAccept: image/avif,image/webp,image/*,*/*;q=0.8\r\n",
                'follow_location' => 1,
                'timeout' => 30
            ],
            'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]
        ]);
        $buf = @file_get_contents($raw, false, $ctx);
        if ($buf === false) {
            $rest['ok'] = false;
            $rest['error']['msg'] = 'download failed';
            return;
        }
    } else {
        $path = resolveReadyShowPath($raw);
        if ($path === null || !is_file($path)) {
            $rest['ok'] = false;
            $rest['error']['msg'] = 'file not found';
            return;
        }
        $buf = file_get_contents($path);
        $ext = strtolower(strrchr($path, '.'));
        if ($ext === '.png') $mime = 'image/png';
        elseif ($ext === '.webp') $mime = 'image/webp';
        elseif ($ext === '.gif') $mime = 'image/gif';
        if ($ext === '' || $ext === false) $ext = '.jpg';
    }
    if (strlen($buf) > 12 * 1024 * 1024) {
        $rest['ok'] = false;
        $rest['error']['msg'] = 'image too large';
        return;
    }
    $rest['output']['base64'] = base64_encode($buf);
    $rest['output']['mime'] = $mime;
    $rest['output']['fileName'] = $name . $ext;
    $rest['ok'] = true;
}

function showPackageFileName($showName, $displayId) {
    $base = preg_replace('/[^a-zA-Z0-9\-_.]/', '_', (string)$showName);
    $base = preg_replace('/\.{2,}/', '.', $base);
    $base = trim($base, '._');
    if ($base === '') $base = 'show';
    $slug = displaySlugForId($displayId);
    return $slug === '' ? $base . '.show' : $base . '_' . $slug . '.show';
}

function showDisplayId($showName) {
    if ($showName === '') return '';
    $show = readAllJSONObject(pathCorrection('./shows/' . getSafeShowName($showName) . DIRECTORY_SEPARATOR . 'show.json'));
    return ($show !== null && isset($show['displayId'])) ? (string)$show['displayId'] : '';
}

function fileReadAllText($pathName) {
    if (!file_exists($pathName)) {
        return '';
    }
    $times = 0;
    while ($times < 1000) {
        try {
            $content = @file_get_contents($pathName);
            if ($content !== false) {
                return $content;
            }
        } catch (Exception $e) {
            // Continue retrying
        }
        $times++;
        usleep(100000); // 100ms
    }
    return '';
}

function fileWriteAllText($pathName, $text) {
    $times = 0;
    while ($times < 1000) {
        try {
            $result = @file_put_contents($pathName, $text);
            if ($result !== false) {
                return true;
            }
        } catch (Exception $e) {
            // Continue retrying
        }
        $times++;
        usleep(100000); // 100ms
    }
    return false;
}

function readAllJSONObject($pathName) {
    try {
        $json = fileReadAllText($pathName);
        if (empty($json)) {
            return null;
        }
        $data = json_decode($json, true);
        return $data !== null ? $data : null;
    } catch (Exception $e) {
        return null;
    }
}

function writeAllJSONNoFormat($pathName, $data) {
    $json = json_encode($data, JSON_UNESCAPED_SLASHES);
    return fileWriteAllText($pathName, $json);
}

function unzipBufferToString($zippedBuffer) {
    if (empty($zippedBuffer)) {
        return '';
    }
    
    $tempFile = tempnam(sys_get_temp_dir(), 'zip_');
    file_put_contents($tempFile, $zippedBuffer);
    
    $zip = new ZipArchive();
    if ($zip->open($tempFile) === TRUE) {
        $firstEntry = $zip->getNameIndex(0);
        if ($firstEntry !== false) {
            $content = $zip->getFromIndex(0);
            $zip->close();
            unlink($tempFile);
            return $content;
        }
        $zip->close();
    }
    unlink($tempFile);
    return '';
}

function createZippedBufferByString($content, $fileNameInZip) {
    $tempFile = tempnam(sys_get_temp_dir(), 'zip_');
    $zip = new ZipArchive();
    if ($zip->open($tempFile, ZipArchive::CREATE) === TRUE) {
        $zip->addFromString($fileNameInZip, $content);
        $zip->close();
        $zippedContent = file_get_contents($tempFile);
        unlink($tempFile);
        return $zippedContent;
    }
    return '';
}

function isSaveImageInkFile($fileName, $data) {
    if (empty($fileName) || empty($data)) {
        return false;
    }
    $pathInfo = pathinfo($fileName);
    if (strtolower($pathInfo['extension']) !== 'ink') {
        return false;
    }
    $nameWithoutExt = $pathInfo['filename'];
    if (!preg_match('/^[0-9]+$/', $nameWithoutExt)) {
        return false;
    }
    $firstByte = ord($data[0]);
    $isDigit = ($firstByte >= 48 && $firstByte <= 57);
    $isUpper = ($firstByte >= 65 && $firstByte <= 90);
    $isLower = ($firstByte >= 97 && $firstByte <= 122);
    return ($isDigit || $isUpper || $isLower);
}

function registerDeviceEcho(&$rest) {
    try {
        $devicesPathName = pathCorrection('./shows/devices.json');
        if (isset($rest['input']['deviceInfo'])) {
            $device = $rest['input']['deviceInfo'];
            $devices = readAllJSONObject($devicesPathName);
            if ($devices === null) {
                $devices = [];
            }
            $deviceID = $device['name'] . '_' . $device['ip'];
            $device['lastEcho'] = round(microtime(true) * 1000);
            $devices[$deviceID] = $device;
            writeAllJSONNoFormat($devicesPathName, $devices);
        }
    } catch (Exception $e) {
        // Silently ignore errors
    }
}

function channelSlugOk($slug) {
    return is_string($slug) && preg_match('/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/', $slug);
}

function normalizeChannelSlug($raw) {
    $s = is_string($raw) ? trim($raw) : '';
    return channelSlugOk($s) ? $s : '';
}

function slugFromShowName($name) {
    $s = strtolower(trim((string)$name));
    $s = preg_replace('/[^a-z0-9_-]+/', '-', $s);
    $s = trim($s, '-');
    $s = substr($s, 0, 32);
    return channelSlugOk($s) ? $s : '';
}

function uniqueChannelSlug($channels, $preferred) {
    $slug = normalizeChannelSlug($preferred) ?: 'channel';
    if (!isset($channels[$slug])) return $slug;
    $base = substr($slug, 0, 28);
    $n = 2;
    while (isset($channels[$base . '-' . $n])) $n++;
    return substr($base . '-' . $n, 0, 32);
}

function emptyShowsCfg() {
    return [
        'shows' => [],
        'dayStart' => 7,
        'dayEnd' => 24,
        'activeShows' => [],
        'channels' => [],
        'defaultChannel' => ''
    ];
}

function normalizeRestHour($raw, $fallback) {
    if (!is_numeric($raw)) return $fallback;
    $n = intval($raw);
    return ($n >= 0 && $n <= 23) ? $n : $fallback;
}

function applyShowRestDefaults(&$show) {
    if (!is_array($show)) return $show;
    $show['restStart'] = array_key_exists('restStart', $show)
        ? normalizeRestHour($show['restStart'], 22)
        : 22;
    $show['restEnd'] = array_key_exists('restEnd', $show)
        ? normalizeRestHour($show['restEnd'], 6)
        : 6;
    return $show;
}

function stripShowRestWindow(&$show) {
    if (!is_array($show)) return $show;
    unset($show['restActive'], $show['nextRestStart'], $show['restSleepUntil'], $show['tzOffsetMin']);
    return $show;
}

function restWindowUnix($restStart, $restEnd, $now = null) {
    $start = normalizeRestHour($restStart, 22);
    $end = normalizeRestHour($restEnd, 6);
    if ($start === $end) {
        return ['restActive' => false, 'nextRestStart' => 0, 'restSleepUntil' => 0];
    }
    $now = $now === null ? time() : intval($now);
    $h = intval(date('G', $now));
    $y = intval(date('Y', $now));
    $m = intval(date('n', $now));
    $d = intval(date('j', $now));
    $atHour = function ($dayOffset, $hour) use ($y, $m, $d) {
        return mktime($hour, 0, 0, $m, $d + $dayOffset, $y);
    };
    if ($start > $end) {
        if ($h >= $start) {
            $nextRestStart = $atHour(0, $start);
            $restSleepUntil = $atHour(1, $end);
        } elseif ($h < $end) {
            $nextRestStart = $atHour(-1, $start);
            $restSleepUntil = $atHour(0, $end);
        } else {
            $nextRestStart = $atHour(0, $start);
            $restSleepUntil = $atHour(1, $end);
        }
    } elseif ($h < $start) {
        $nextRestStart = $atHour(0, $start);
        $restSleepUntil = $atHour(0, $end);
    } elseif ($h < $end) {
        $nextRestStart = $atHour(0, $start);
        $restSleepUntil = $atHour(0, $end);
    } else {
        $nextRestStart = $atHour(1, $start);
        $restSleepUntil = $atHour(1, $end);
    }
    return [
        'restActive' => $now >= $nextRestStart && $now < $restSleepUntil,
        'nextRestStart' => $nextRestStart,
        'restSleepUntil' => $restSleepUntil
    ];
}

function attachShowRestWindow(&$show) {
    if (!is_array($show)) return $show;
    applyShowRestDefaults($show);
    $win = restWindowUnix($show['restStart'], $show['restEnd']);
    $show['restActive'] = $win['restActive'];
    $show['nextRestStart'] = $win['nextRestStart'];
    $show['restSleepUntil'] = $win['restSleepUntil'];
    $show['tzOffsetMin'] = intval(round((int)date('Z') / 60));
    return $show;
}

function syncActiveShows(&$shows) {
    $active = [];
    foreach ($shows['channels'] as $ch) {
        if (!empty($ch['displayId']) && !empty($ch['showName'])) {
            $active[$ch['displayId']] = $ch['showName'];
        }
    }
    $shows['activeShows'] = $active;
    return $shows;
}

function migrateShowsCfg($shows) {
    if (!is_array($shows)) $shows = emptyShowsCfg();
    if (!isset($shows['shows']) || !is_array($shows['shows'])) $shows['shows'] = [];
    if (!isset($shows['activeShows']) || !is_array($shows['activeShows'])) $shows['activeShows'] = [];
    if (!isset($shows['channels']) || !is_array($shows['channels'])) {
        $shows['channels'] = [];
    }
    $slugs = array_keys($shows['channels']);
    if (empty($shows['defaultChannel']) || !isset($shows['channels'][$shows['defaultChannel']])) {
        $shows['defaultChannel'] = $slugs[0] ?? '';
    }
    return syncActiveShows($shows);
}

function requestedChannelSlug($input) {
    if (isset($_GET['channel'])) {
        $q = normalizeChannelSlug($_GET['channel']);
        if ($q !== '') return $q;
    }
    if (is_array($input) && isset($input['channel'])) {
        $i = normalizeChannelSlug($input['channel']);
        if ($i !== '') return $i;
    }
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (preg_match('#/c/([A-Za-z0-9][A-Za-z0-9_-]{0,31})/?$#', (string)$uri, $m)) {
        return $m[1];
    }
    return '';
}

function resolveChannelCfg($shows, $requestedSlug) {
    $cfg = migrateShowsCfg($shows);
    $slug = normalizeChannelSlug($requestedSlug);
    if ($slug !== '') {
        if (isset($cfg['channels'][$slug])) {
            return ['shows' => $cfg, 'channel' => array_merge(['slug' => $slug], $cfg['channels'][$slug]), 'channelError' => null];
        }
        return ['shows' => $cfg, 'channel' => null, 'channelError' => 'unknown'];
    }
    $def = $cfg['defaultChannel'] ?? '';
    if ($def !== '' && isset($cfg['channels'][$def])) {
        return ['shows' => $cfg, 'channel' => array_merge(['slug' => $def], $cfg['channels'][$def]), 'channelError' => null];
    }
    return ['shows' => $cfg, 'channel' => null, 'channelError' => 'no_default'];
}

function assignShowToChannelCfg($shows, $showName, $displayId, $channel = '') {
    $cfg = migrateShowsCfg($shows);
    if ($showName === '') throw new Exception('showName fehlt.');
    $did = $displayId !== '' ? (string)$displayId : '';
    $slug = normalizeChannelSlug($channel);
    if ($slug !== '') {
        if (!isset($cfg['channels'][$slug])) throw new Exception('Kanal nicht gefunden.');
        $chDid = (string)($cfg['channels'][$slug]['displayId'] ?? '');
        if ($chDid === '') throw new Exception('Kanal hat keinen Displaytyp.');
        if ($did === '') throw new Exception('Show-Display fehlt.');
        if ($did !== $chDid) throw new Exception('Show-Display passt nicht zum Kanal.');
    } else {
        throw new Exception('Kanal fehlt — Kanäle werden nur manuell angelegt.');
    }
    $cfg['channels'][$slug]['showName'] = $showName;
    return syncActiveShows($cfg);
}

function channelSlugForShow($cfg, $showName) {
    foreach ($cfg['channels'] as $slug => $ch) {
        if (($ch['showName'] ?? '') === $showName) return $slug;
    }
    return '';
}

function ensureShowHasChannel($shows, $showName, $displayId = '', $channel = '') {
    $cfg = migrateShowsCfg($shows);
    if ($showName === '') throw new Exception('showName fehlt.');
    $requested = normalizeChannelSlug($channel);
    if ($requested !== '') {
        return assignShowToChannelCfg($cfg, $showName, $displayId, $requested);
    }
    $existing = channelSlugForShow($cfg, $showName);
    if ($existing !== '') {
        $chDid = $cfg['channels'][$existing]['displayId'] ?? '';
        if ($displayId !== '' && $chDid !== '' && $chDid !== $displayId) {
            throw new Exception('Show-Display passt nicht zum Kanal.');
        }
        return syncActiveShows($cfg);
    }
    return $cfg;
}

function getDevices(&$rest) {
    $devicesPathName = pathCorrection('./shows/devices.json');
    $devices = readAllJSONObject($devicesPathName);
    if ($devices === null) {
        $devices = [];
    }
    $rest['output']['devices'] = $devices;
    $rest['ok'] = true;
}

function createShow(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $orgShowName = $rest['input']['showName'];
    $displayId = $rest['input']['displayId'];
    $showName = getSafeShowName($orgShowName);
    $showPath = pathCorrection('./shows/' . $showName);
    $showPathName = $showPath . DIRECTORY_SEPARATOR . 'show.json';
    
    if (isValidDirectoryName($showName)) {
        $shows = readAllJSONObject($showsPathName);
        if ($shows === null) {
            $shows = emptyShowsCfg();
        }
        $shows = migrateShowsCfg($shows);
        
        if (!in_array($orgShowName, $shows['shows'])) {
            $shows['shows'][] = $orgShowName;
        }

        $channel = $rest['input']['channel'] ?? '';
        if ($channel !== '') {
            $slug = normalizeChannelSlug($channel);
            if ($slug === '' || !isset($shows['channels'][$slug])) {
                throw new Exception('Kanal nicht gefunden.');
            }
            if (!isset($shows['channels'][$slug]['shows']) || !is_array($shows['channels'][$slug]['shows'])) {
                $shows['channels'][$slug]['shows'] = [];
            }
            if (!in_array($orgShowName, $shows['channels'][$slug]['shows'], true)) {
                $shows['channels'][$slug]['shows'][] = $orgShowName;
            }
            $shows = syncActiveShows($shows);
        }
        
        writeAllJSONNoFormat($showsPathName, $shows);
        
        if (!is_dir($showPath)) {
            mkdir($showPath, 0755, true);
        }
        
        $show = readAllJSONObject($showPathName);
        if ($show === null) {
            $show = [
                'name' => $orgShowName,
                'timer' => 1,
                'mode' => 'random',
                'restStart' => 22,
                'restEnd' => 6,
                'imgs' => [],
                'displayId' => $displayId
            ];
        }
        writeAllJSONNoFormat($showPathName, $show);
        $rest['output']['shows'] = $shows;
        $rest['output']['showName'] = $showName;
        $rest['ok'] = true;
    } else {
        $rest['ok'] = false;
    }
}

function deleteShow(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $orgShowName = $rest['input']['showName'];
    $showName = getSafeShowName($orgShowName);
    $showPathName = pathCorrection('./shows/' . $showName);
    
    if (is_dir($showPathName)) {
        // Get displayId before deleting
        $showPathNameForDisplay = pathCorrection('./shows/' . $showName . DIRECTORY_SEPARATOR . 'show.json');
        $show = readAllJSONObject($showPathNameForDisplay);
        $showDisplayId = null;
        if ($show !== null && isset($show['displayId'])) {
            $showDisplayId = $show['displayId'];
        }
        
        // Delete directory recursively
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($showPathName, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($files as $fileinfo) {
            $todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
            $todo($fileinfo->getRealPath());
        }
        rmdir($showPathName);
        
        $rest['ok'] = true;
        $shows = readAllJSONObject($showsPathName);
        if ($shows === null) {
            $shows = [
                'activeShows' => [],
                'shows' => [],
                'timer' => 1,
                'dayStart' => 7,
                'dayEnd' => 24,
                'mode' => 'random'
            ];
        } else {
            // Remove from shows array
            $shows['shows'] = array_values(array_filter($shows['shows'], function($s) use ($orgShowName) {
                return $s !== $orgShowName;
            }));
            
            $shows = migrateShowsCfg($shows);
            $replacementByDisplay = [];
            if ($showDisplayId !== null) {
                foreach ($shows['shows'] as $candidateShowName) {
                    $candidateSafeName = getSafeShowName($candidateShowName);
                    $candidateShowPath = pathCorrection('./shows/' . $candidateSafeName . DIRECTORY_SEPARATOR . 'show.json');
                    $candidateShow = readAllJSONObject($candidateShowPath);
                    if ($candidateShow !== null && isset($candidateShow['displayId']) && $candidateShow['displayId'] === $showDisplayId) {
                        $replacementByDisplay[$showDisplayId] = $candidateShowName;
                        break;
                    }
                }
            }
            foreach ($shows['channels'] as $slug => $ch) {
                if (($ch['showName'] ?? '') === $orgShowName) {
                    $next = ($showDisplayId !== null && isset($replacementByDisplay[$showDisplayId])) ? $replacementByDisplay[$showDisplayId] : '';
                    $shows['channels'][$slug]['showName'] = $next;
                }
            }
            syncActiveShows($shows);
        }
        writeAllJSONNoFormat($showsPathName, $shows);
        $rest['output']['shows'] = $shows;
    }
}

function saveShowImage(&$rest) {
    $orgShowName = $rest['input']['showName'];
    $showName = getSafeShowName($orgShowName);
    $showPath = pathCorrection('./shows/' . $showName);
    $showPathName = $showPath . DIRECTORY_SEPARATOR . 'show.json';
    $imageData = $rest['input']['img'];
    $mimeType = dataUrlMimeType($imageData);
    $rawdataBase64 = dataUrlData($imageData);
    $rawdata = base64_decode($rawdataBase64);
    $show = null;
    $rest['ok'] = false;
    
    if ($mimeType === 'image/ink') {
        $show = readAllJSONObject($showPathName);
        if ($show !== null) {
            // Detect format version
            $firstByte = ord($rawdata[0]);
            $currentOrientation = null;
            $displayId = null;
            
            if (($firstByte === 1 || $firstByte === 2 || $firstByte === 3) && strlen($rawdata) >= 4) {
                // Version 1 (LZW), 2 (Deflate), 3 (Paeth+Deflate): [version, displayId, dither, orient, ...]
                $displayId = chr(ord($rawdata[1]));
                $currentOrientation = ord($rawdata[3]);
            } else {
                // Old format: [displayId, dither, orient, minCodeSize, ...]
                $displayId = chr($firstByte);
                $currentOrientation = ord($rawdata[2]);
            }
            
            $isLandscape = ($currentOrientation === 0 || $currentOrientation === 2);
            if ($displayId === $show['displayId']) {
                $timestamp = round(microtime(true) * 1000);
                $orientationPrefix = $isLandscape ? '0' : '1';
                if ($currentOrientation === 2) $orientationPrefix = '2';
                if ($currentOrientation === 3) $orientationPrefix = '3';
                $imageName = $orientationPrefix . $timestamp . '.ink';
                
                // Check if replacing existing image
                if (isset($rest['input']['replaceImageName'])) {
                    $oldImageName = $rest['input']['replaceImageName'];
                    $oldImagePath = $showPath . DIRECTORY_SEPARATOR . $oldImageName;
                    if (file_exists($oldImagePath)) {
                        unlink($oldImagePath);
                        // Remove from imgs array
                        $show['imgs'] = array_values(array_filter($show['imgs'], function($img) use ($oldImageName) {
                            return $img !== $oldImageName;
                        }));
                        $imageName = $oldImageName; // Use same name
                    }
                }
                
                if (isSaveImageInkFile($imageName, $rawdata)) {
                    $imgPathName = $showPath . DIRECTORY_SEPARATOR . $imageName;
                    file_put_contents($imgPathName, $rawdata);
                    if (!in_array($imageName, $show['imgs'])) {
                        $show['imgs'][] = $imageName;
                    }
                    writeAllJSONNoFormat($showPathName, $show);
                    $rest['output']['show'] = $show;
                    $rest['output']['imgName'] = $imageName;
                    $rest['ok'] = true;
                }
            }
        }
    }
}

function deleteShowImage(&$rest) {
    $orgShowName = $rest['input']['showName'];
    $showName = getSafeShowName($orgShowName);
    $showPath = pathCorrection('./shows/' . $showName);
    $showPathName = $showPath . DIRECTORY_SEPARATOR . 'show.json';
    $imgName = $rest['input']['imgName'];
    $imgPathName = $showPath . DIRECTORY_SEPARATOR . $imgName;
    $show = null;
    
    if (file_exists($imgPathName)) {
        unlink($imgPathName);
        $show = readAllJSONObject($showPathName);
        if ($show !== null) {
            $show['imgs'] = array_values(array_filter($show['imgs'], function($img) use ($imgName) {
                return $img !== $imgName;
            }));
            writeAllJSONNoFormat($showPathName, $show);
            $rest['output']['show'] = $show;
            $rest['ok'] = true;
        } else {
            $rest['error'] = ['msg' => 'Show not found', 'code' => 1];
        }
    } else {
        $rest['ok'] = false;
    }
    $rest['output']['show'] = $show;
}

function getShow(&$rest) {
    registerDeviceEcho($rest);
    $orgShowName = $rest['input']['showName'];
    $showName = getSafeShowName($orgShowName);
    $showPath = pathCorrection('./shows/' . $showName);
    $showPathName = $showPath . DIRECTORY_SEPARATOR . 'show.json';
    $show = readAllJSONObject($showPathName);
    if ($show !== null) {
        attachShowRestWindow($show);
        $rest['output']['show'] = $show;
        $rest['ok'] = true;
    } else {
        $rest['ok'] = false;
    }
}

function setActiveShow(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $orgShowName = $rest['input']['showName'] ?? '';
    $displayId = $rest['input']['displayId'] ?? '';
    $channel = $rest['input']['channel'] ?? '';
    if ($displayId === '' && $orgShowName !== '') {
        $show = readAllJSONObject(pathCorrection('./shows/' . getSafeShowName($orgShowName) . DIRECTORY_SEPARATOR . 'show.json'));
        if ($show !== null && isset($show['displayId'])) $displayId = $show['displayId'];
    }
    $shows = migrateShowsCfg(readAllJSONObject($showsPathName));
    $shows = assignShowToChannelCfg($shows, $orgShowName, $displayId, $channel);
    writeAllJSONNoFormat($showsPathName, $shows);
    $rest['output']['shows'] = $shows;
    $rest['ok'] = true;
}

function setShowSettings(&$rest) {
    $orgShowName = $rest['input']['showName'];
    $showName = getSafeShowName($orgShowName);
    $showPath = pathCorrection('./shows/' . $showName);
    $showPathName = $showPath . DIRECTORY_SEPARATOR . 'show.json';
    $show = readAllJSONObject($showPathName);
    if ($show !== null) {
        $show['mode'] = $rest['input']['showMode'];
        $show['timer'] = intval($rest['input']['showTimer']);
        if (isset($rest['input']['showRestStart'])) $show['restStart'] = $rest['input']['showRestStart'];
        if (isset($rest['input']['showRestEnd'])) $show['restEnd'] = $rest['input']['showRestEnd'];
        applyShowRestDefaults($show);
        stripShowRestWindow($show);
        writeAllJSONNoFormat($showPathName, $show);
        attachShowRestWindow($show);
        $rest['output']['show'] = $show;
        $rest['ok'] = true;
    } else {
        $rest['ok'] = false;
    }
}

function getShows(&$rest) {
    try {
        registerDeviceEcho($rest);
        $showsPathName = pathCorrection('./shows/shows.json');
        $shows = migrateShowsCfg(readAllJSONObject($showsPathName));
        writeAllJSONNoFormat($showsPathName, $shows);
        $resolved = resolveChannelCfg($shows, requestedChannelSlug($rest['input'] ?? []));
        $rest['output']['shows'] = $resolved['shows'];
        $rest['output']['channel'] = $resolved['channel'];
        $rest['output']['channelError'] = $resolved['channelError'];
        attachPendingOta($rest);
        $rest['ok'] = true;
    } catch (Exception $e) {
        $rest['ok'] = false;
        $rest['error'] = ['msg' => 'Error in GetShows: ' . $e->getMessage(), 'code' => -1];
    }
}

function createChannel(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $shows = migrateShowsCfg(readAllJSONObject($showsPathName));
    $slug = normalizeChannelSlug($rest['input']['slug'] ?? '');
    $displayId = $rest['input']['displayId'] ?? '';
    if ($slug === '') throw new Exception('Ungültiger Kanal-Slug.');
    if (isset($shows['channels'][$slug])) throw new Exception('Kanal existiert bereits.');
    if ($displayId === '') throw new Exception('displayId fehlt.');
    $assignedShow = (string)($rest['input']['showName'] ?? '');
    if ($assignedShow !== '') {
        $showDid = showDisplayId($assignedShow);
        if ($showDid !== '' && $showDid !== (string)$displayId) {
            throw new Exception('Show-Display passt nicht zum Kanal.');
        }
    }
    $shows['channels'][$slug] = ['displayId' => (string)$displayId, 'showName' => $assignedShow];
    if (empty($shows['defaultChannel'])) $shows['defaultChannel'] = $slug;
    syncActiveShows($shows);
    writeAllJSONNoFormat($showsPathName, $shows);
    $rest['output']['shows'] = $shows;
    $rest['ok'] = true;
}

function updateChannel(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $shows = migrateShowsCfg(readAllJSONObject($showsPathName));
    $slug = normalizeChannelSlug($rest['input']['slug'] ?? '');
    if ($slug === '' || !isset($shows['channels'][$slug])) throw new Exception('Kanal nicht gefunden.');
    if (isset($rest['input']['displayId']) && $rest['input']['displayId'] !== '') {
        $existingDid = (string)($shows['channels'][$slug]['displayId'] ?? '');
        if ($existingDid !== '' && $existingDid !== (string)$rest['input']['displayId']) {
            throw new Exception('Displaytyp des Kanals ist fest.');
        }
    }
    if (array_key_exists('showName', $rest['input'])) {
        $nextShow = (string)$rest['input']['showName'];
        if ($nextShow !== '') {
            $showDid = showDisplayId($nextShow);
            $chDid = (string)($shows['channels'][$slug]['displayId'] ?? '');
            if ($showDid !== '' && $chDid !== '' && $showDid !== $chDid) {
                throw new Exception('Show-Display passt nicht zum Kanal.');
            }
        }
        $shows['channels'][$slug]['showName'] = $nextShow;
    }
    $newSlug = normalizeChannelSlug($rest['input']['newSlug'] ?? '');
    if ($newSlug !== '' && $newSlug !== $slug) {
        if (isset($shows['channels'][$newSlug])) throw new Exception('Neuer Slug ist schon vergeben.');
        $shows['channels'][$newSlug] = $shows['channels'][$slug];
        unset($shows['channels'][$slug]);
        if (($shows['defaultChannel'] ?? '') === $slug) $shows['defaultChannel'] = $newSlug;
    }
    syncActiveShows($shows);
    writeAllJSONNoFormat($showsPathName, $shows);
    $rest['output']['shows'] = $shows;
    $rest['ok'] = true;
}

function deleteChannel(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $shows = migrateShowsCfg(readAllJSONObject($showsPathName));
    $slug = normalizeChannelSlug($rest['input']['slug'] ?? '');
    if ($slug === '' || !isset($shows['channels'][$slug])) throw new Exception('Kanal nicht gefunden.');
    unset($shows['channels'][$slug]);
    if (($shows['defaultChannel'] ?? '') === $slug) {
        $keys = array_keys($shows['channels']);
        $shows['defaultChannel'] = $keys[0] ?? '';
    }
    syncActiveShows($shows);
    writeAllJSONNoFormat($showsPathName, $shows);
    $rest['output']['shows'] = $shows;
    $rest['ok'] = true;
}

function setDefaultChannel(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $shows = migrateShowsCfg(readAllJSONObject($showsPathName));
    $slug = normalizeChannelSlug($rest['input']['slug'] ?? '');
    if ($slug === '' || !isset($shows['channels'][$slug])) throw new Exception('Kanal nicht gefunden.');
    $shows['defaultChannel'] = $slug;
    syncActiveShows($shows);
    writeAllJSONNoFormat($showsPathName, $shows);
    $rest['output']['shows'] = $shows;
    $rest['ok'] = true;
}

function exportShow(&$rest) {
    $orgShowName = $rest['input']['showName'];
    $showName = getSafeShowName($orgShowName);
    $showPath = pathCorrection('./shows/' . $showName);
    $showPathName = $showPath . DIRECTORY_SEPARATOR . 'show.json';
    
    if (is_dir($showPath)) {
        $show = readAllJSONObject($showPathName);
        if ($show !== null) {
            $export = ['name' => $orgShowName, 'show' => $show];
            $imgsData = [];
            if (isset($show['imgs']) && is_array($show['imgs'])) {
                foreach ($show['imgs'] as $imgName) {
                    $imgPath = $showPath . DIRECTORY_SEPARATOR . $imgName;
                    if (file_exists($imgPath)) {
                        $imgData = file_get_contents($imgPath);
                        $imgBase64 = base64_encode($imgData);
                        $imgsData[$imgName] = 'data:image/ink;base64,' . $imgBase64;
                    }
                }
            }
            $export['imgsdata'] = $imgsData;
            $json = json_encode($export, JSON_UNESCAPED_SLASHES);
            $packageName = showPackageFileName($orgShowName, isset($show['displayId']) ? $show['displayId'] : '');
            $zipped = createZippedBufferByString($json, $packageName);
            $rest['output']['showZip'] = base64_encode($zipped);
            $rest['output']['showFile'] = $packageName;
            $rest['ok'] = true;
        } else {
            $rest['ok'] = false;
        }
    } else {
        $rest['ok'] = false;
    }
}

function importShow(&$rest) {
    $rest['ok'] = false;
    $rest['error'] = ['msg' => '', 'code' => 0];
    
    if (!isset($rest['input']['importShow'])) {
        $rest['error'] = ['msg' => 'No import data provided', 'code' => 1];
        return;
    }
    
    try {
        $zipBuffer = base64_decode($rest['input']['importShow']);
        $json = unzipBufferToString($zipBuffer);
        $info = json_decode($json, true);
        
        if ($info !== null) {
            $orgShowName = $info['name'];
            $showName = getSafeShowName($orgShowName);
            if (isValidDirectoryName($showName)) {
                $showsPathName = pathCorrection('./shows/shows.json');
                $showPath = pathCorrection('./shows/' . $showName);
                $showPathName = $showPath . DIRECTORY_SEPARATOR . 'show.json';
                $shows = readAllJSONObject($showsPathName);
                if ($shows === null) {
                    $shows = [
                        'shows' => [],
                        'dayStart' => 7,
                        'dayEnd' => 24,
                        'activeShows' => []
                    ];
                }
                $show = ['imgs' => []];
                
                if (!is_dir($showPath)) {
                    mkdir($showPath, 0755, true);
                }
                
                if (isset($info['imgsdata']) && is_array($info['imgsdata'])) {
                    foreach ($info['imgsdata'] as $imgName => $imgData) {
                        $mimeType = dataUrlMimeType($imgData);
                        $dataString = dataUrlData($imgData);
                        $dataBytes = base64_decode($dataString);
                        if (isSaveImageInkFile($imgName, $dataBytes)) {
                            file_put_contents($showPathName . DIRECTORY_SEPARATOR . $imgName, $dataBytes);
                            $show['imgs'][] = $imgName;
                        }
                    }
                }
                
                // Copy other show properties
                if (isset($info['name'])) $show['name'] = $info['name'];
                if (isset($info['timer'])) $show['timer'] = $info['timer'];
                if (isset($info['mode'])) $show['mode'] = $info['mode'];
                if (isset($info['displayId'])) $show['displayId'] = $info['displayId'];
                if (isset($info['restStart'])) $show['restStart'] = $info['restStart'];
                if (isset($info['restEnd'])) $show['restEnd'] = $info['restEnd'];
                applyShowRestDefaults($show);
                stripShowRestWindow($show);
                
                writeAllJSONNoFormat($showPathName, $show);
                if (!in_array($orgShowName, $shows['shows'])) {
                    $shows['shows'][] = $orgShowName;
                }
                writeAllJSONNoFormat($showsPathName, $shows);
                $rest['ok'] = true;
            } else {
                $rest['error'] = ['msg' => 'Invalid show name', 'code' => 3];
            }
        } else {
            $rest['error'] = ['msg' => 'Failed to parse show data', 'code' => 4];
        }
    } catch (Exception $e) {
        $rest['error'] = ['msg' => 'Import error: ' . $e->getMessage(), 'code' => 5];
    }
}

function otaDir() {
    $dir = pathCorrection('./temp/ota');
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir;
}

function otaSafeKey($ip) {
    $s = preg_replace('/[^0-9a-fA-F.:]/', '', (string)$ip);
    return str_replace([':', '.'], '_', $s);
}

function otaQueueWrite($deviceIp, $buf, $fileName = 'firmware.bin') {
    $dir = otaDir();
    $key = otaSafeKey($deviceIp);
    if ($key === '') throw new Exception('deviceIp ungültig.');
    $prev = $dir . DIRECTORY_SEPARATOR . $key . '.json';
    if (is_file($prev)) {
        $old = json_decode(@file_get_contents($prev), true);
        if (!empty($old['token'])) {
            @unlink($dir . DIRECTORY_SEPARATOR . 'token-' . $old['token'] . '.key');
        }
    }
    $token = bin2hex(random_bytes(16));
    file_put_contents($dir . DIRECTORY_SEPARATOR . $key . '.bin', $buf);
    file_put_contents($dir . DIRECTORY_SEPARATOR . $key . '.json', json_encode([
        'token' => $token,
        'deviceIp' => $deviceIp,
        'fileName' => $fileName,
        'size' => strlen($buf),
        'queuedAt' => round(microtime(true) * 1000)
    ]));
    file_put_contents($dir . DIRECTORY_SEPARATOR . 'token-' . $token . '.key', $key);
    return ['token' => $token, 'size' => strlen($buf), 'fileName' => $fileName];
}

function attachPendingOta(&$rest) {
    global $input;
    $ips = [];
    if (!empty($input['deviceInfo']['ip'])) $ips[] = $input['deviceInfo']['ip'];
    if (!empty($input['deviceIp'])) $ips[] = $input['deviceIp'];
    $remote = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    if ($remote) $ips[] = trim(explode(',', $remote)[0]);
    $dir = otaDir();
    foreach ($ips as $ip) {
        $key = otaSafeKey($ip);
        if ($key === '') continue;
        $metaPath = $dir . DIRECTORY_SEPARATOR . $key . '.json';
        if (!is_file($metaPath)) continue;
        $meta = json_decode(file_get_contents($metaPath), true);
        if (!empty($meta['token'])) {
            $rest['output']['pendingOta'] = [
                'token' => $meta['token'],
                'size' => $meta['size'] ?? 0,
                'fileName' => $meta['fileName'] ?? 'firmware.bin'
            ];
            return;
        }
    }
}

function resolveFirmwareBuildBin($id) {
    $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$id);
    if ($safe === '') throw new Exception('firmwareId fehlt.');
    $fp = pathCorrection('./firmware/.pio/build/' . $safe . '/firmware.bin');
    $root = pathCorrection('./firmware/.pio/build');
    if (strpos(realpath($fp) ?: $fp, realpath($root) ?: $root) !== 0) throw new Exception('path not allowed');
    if (!is_file($fp)) throw new Exception('firmware.bin nicht gefunden.');
    return $fp;
}

function loadFirmwareBuffer($input) {
    if (!empty($input['firmwareId'])) {
        $fp = resolveFirmwareBuildBin($input['firmwareId']);
        return ['buf' => file_get_contents($fp), 'fileName' => $input['firmwareId'] . '.bin'];
    }
    $fw64 = $input['firmware'] ?? '';
    if ($fw64 === '') throw new Exception('firmware (Base64) oder firmwareId fehlt.');
    $buf = base64_decode($fw64, true);
    if ($buf === false) throw new Exception('Ungültige Base64-Firmware.');
    return ['buf' => $buf, 'fileName' => 'firmware.bin'];
}

function listFirmwareBins(&$rest) {
    $bins = [];
    $root = pathCorrection('./firmware/.pio/build');
    if (is_dir($root)) {
        foreach (scandir($root) as $name) {
            if ($name === '.' || $name === '..') continue;
            $fp = $root . DIRECTORY_SEPARATOR . $name . DIRECTORY_SEPARATOR . 'firmware.bin';
            if (!is_file($fp)) continue;
            $bins[] = [
                'id' => $name,
                'label' => $name,
                'size' => filesize($fp),
                'mtime' => date('c', filemtime($fp))
            ];
        }
    }
    $rest['output']['bins'] = $bins;
    $rest['ok'] = true;
}

function servePendingOta() {
    $token = preg_replace('/[^a-zA-Z0-9]/', '', $_GET['token'] ?? '');
    if ($token === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => ['msg' => 'token fehlt']]);
        exit(0);
    }
    $dir = otaDir();
    $keyFile = $dir . DIRECTORY_SEPARATOR . 'token-' . $token . '.key';
    if (!is_file($keyFile)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => ['msg' => 'kein pending OTA']]);
        exit(0);
    }
    $key = trim(file_get_contents($keyFile));
    $binPath = $dir . DIRECTORY_SEPARATOR . $key . '.bin';
    if (!is_file($binPath)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => ['msg' => 'OTA-Datei fehlt']]);
        exit(0);
    }
    while (ob_get_level()) ob_end_clean();
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="firmware.bin"');
    header('Content-Length: ' . filesize($binPath));
    readfile($binPath);
    @unlink($binPath);
    @unlink($dir . DIRECTORY_SEPARATOR . $key . '.json');
    @unlink($keyFile);
    exit(0);
}

function firmwareUpdateProxy(&$rest) {
    global $input;
    $deviceIp = $input['deviceIp'] ?? '';
    if (empty($deviceIp)) throw new Exception('deviceIp fehlt.');
    $loaded = loadFirmwareBuffer($input);
    $fwBin = $loaded['buf'];
    if (!empty($input['queue'])) {
        $queued = otaQueueWrite($deviceIp, $fwBin, $loaded['fileName']);
        $rest['output']['queued'] = true;
        $rest['output']['pendingOta'] = $queued;
        $rest['ok'] = true;
        return;
    }

    $boundary = '----FWUpload' . time();
    $body = "--{$boundary}\r\n"
          . "Content-Disposition: form-data; name=\"firmware\"; filename=\"firmware.bin\"\r\n"
          . "Content-Type: application/octet-stream\r\n\r\n"
          . $fwBin
          . "\r\n--{$boundary}--\r\n";

    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: multipart/form-data; boundary={$boundary}\r\nContent-Length: " . strlen($body),
            'content' => $body,
            'timeout' => 120,
            'ignore_errors' => true
        ]
    ];
    $ctx = stream_context_create($opts);
    $result = @file_get_contents("http://{$deviceIp}/ota", false, $ctx);
    if ($result === false) {
        $queued = otaQueueWrite($deviceIp, $fwBin, $loaded['fileName']);
        $rest['output']['queued'] = true;
        $rest['output']['pendingOta'] = $queued;
        $rest['output']['deviceUnreachable'] = true;
        $rest['ok'] = true;
        return;
    }

    $json = json_decode($result, true);
    $rest['output']['deviceResponse'] = $json ?: ['msg' => $result];
    $rest['ok'] = isset($json['ok']) ? (bool)$json['ok'] : false;
    if (!$rest['ok']) {
        $rest['error'] = ['msg' => $json['msg'] ?? 'Firmware-Update fehlgeschlagen', 'code' => 10];
    }
}

function getDeviceInfoProxy(&$rest) {
    global $input;
    $deviceIp = $input['deviceIp'] ?? '';
    if (empty($deviceIp)) throw new Exception('deviceIp fehlt.');

    $ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
    $result = @file_get_contents("http://{$deviceIp}/info", false, $ctx);
    if ($result === false) throw new Exception('Gerät nicht erreichbar: ' . $deviceIp);

    $rest['output']['deviceInfo'] = json_decode($result, true) ?: ['raw' => $result];
    $rest['ok'] = true;
}

// Route actions
switch ($action) {
    case 'getDevices':
        getDevices($rest);
        break;
    case 'createShow':
        createShow($rest);
        break;
    case 'deleteShow':
        deleteShow($rest);
        break;
    case 'saveShowImage':
        saveShowImage($rest);
        break;
    case 'deleteShowImage':
        deleteShowImage($rest);
        break;
    case 'getShow':
        getShow($rest);
        break;
    case 'setActiveShow':
        setActiveShow($rest);
        break;
    case 'createChannel':
        createChannel($rest);
        break;
    case 'updateChannel':
        updateChannel($rest);
        break;
    case 'deleteChannel':
        deleteChannel($rest);
        break;
    case 'setDefaultChannel':
        setDefaultChannel($rest);
        break;
    case 'setShowSettings':
        setShowSettings($rest);
        break;
    case 'getShows':
        getShows($rest);
        break;
    case 'exportShow':
        exportShow($rest);
        break;
    case 'importShow':
        importShow($rest);
        break;
    case 'listReadyShows':
        listReadyShows($rest);
        break;
    case 'fetchShowSource':
        fetchShowSource($rest);
        break;
    case 'firmwareUpdate':
        firmwareUpdateProxy($rest);
        break;
    case 'listFirmwareBins':
        listFirmwareBins($rest);
        break;
    case 'getPendingOta':
        servePendingOta();
        break;
    case 'getDeviceInfo':
        getDeviceInfoProxy($rest);
        break;
    default:
        if (empty($action)) {
            $rest['error'] = ['msg' => 'No action specified', 'code' => -1];
        } else {
            $rest['error'] = ['msg' => 'Unknown action: ' . $action, 'code' => -1];
        }
        break;
}

// Output JSON response
// Clean any output buffer and ensure clean JSON output
while (ob_get_level()) {
    ob_end_clean();
}
// Ensure no whitespace before JSON
header_remove('X-Powered-By'); // Remove PHP version header
echo json_encode($rest, JSON_UNESCAPED_SLASHES);
exit(0);
