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
    $safeName = preg_replace('/[^a-zA-Z0-9\-_]/', '_', $givenName);
    $safeName = trim($safeName, '_');
    return 'show_' . $safeName;
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
            $shows = [
                'shows' => [],
                'dayStart' => 7,
                'dayEnd' => 24,
                'activeShows' => []
            ];
        }
        
        if (!in_array($orgShowName, $shows['shows'])) {
            $shows['shows'][] = $orgShowName;
        }
        
        if (!isset($shows['activeShows'][$displayId])) {
            $shows['activeShows'][$displayId] = $orgShowName;
        } else {
            $shows['activeShows'][$displayId] = $orgShowName;
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
            
            // Remove from activeShows if this show was active
            $wasActive = false;
            if ($showDisplayId !== null && isset($shows['activeShows'][$showDisplayId])) {
                if ($shows['activeShows'][$showDisplayId] === $orgShowName) {
                    unset($shows['activeShows'][$showDisplayId]);
                    $wasActive = true;
                }
            }
            
            // If this was the active show, try to activate another show with the same displayId
            if ($wasActive && $showDisplayId !== null) {
                $newActiveShow = null;
                foreach ($shows['shows'] as $candidateShowName) {
                    $candidateSafeName = getSafeShowName($candidateShowName);
                    $candidateShowPath = pathCorrection('./shows/' . $candidateSafeName . DIRECTORY_SEPARATOR . 'show.json');
                    $candidateShow = readAllJSONObject($candidateShowPath);
                    if ($candidateShow !== null && isset($candidateShow['displayId'])) {
                        if ($candidateShow['displayId'] === $showDisplayId) {
                            $newActiveShow = $candidateShowName;
                            break;
                        }
                    }
                }
                if ($newActiveShow !== null) {
                    $shows['activeShows'][$showDisplayId] = $newActiveShow;
                }
            }
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
        $rest['output']['show'] = $show;
        $rest['ok'] = true;
    } else {
        $rest['ok'] = false;
    }
}

function setActiveShow(&$rest) {
    $showsPathName = pathCorrection('./shows/shows.json');
    $orgShowName = $rest['input']['showName'];
    $displayId = $rest['input']['displayId'];
    $shows = readAllJSONObject($showsPathName);
    if ($shows === null) {
        $shows = [
            'shows' => [],
            'dayStart' => 7,
            'dayEnd' => 24,
            'activeShows' => []
        ];
    }
    if (!isset($shows['activeShows'])) {
        $shows['activeShows'] = [];
    }
    $shows['activeShows'][$displayId] = $orgShowName;
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
        $rest['output']['show'] = $show;
        writeAllJSONNoFormat($showPathName, $show);
        $rest['ok'] = true;
    } else {
        $rest['ok'] = false;
    }
}

function getShows(&$rest) {
    try {
        registerDeviceEcho($rest);
        $showsPathName = pathCorrection('./shows/shows.json');
        $shows = readAllJSONObject($showsPathName);
        if ($shows === null) {
            $shows = [
                'shows' => [],
                'dayStart' => 7,
                'dayEnd' => 24,
                'activeShows' => []
            ];
        }
        $rest['output']['shows'] = $shows;
        $rest['ok'] = true;
    } catch (Exception $e) {
        $rest['ok'] = false;
        $rest['error'] = ['msg' => 'Error in GetShows: ' . $e->getMessage(), 'code' => -1];
    }
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
            $zipped = createZippedBufferByString($json, $showName . '.show');
            $rest['output']['showZip'] = base64_encode($zipped);
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

function firmwareUpdateProxy(&$rest) {
    global $input;
    $deviceIp = $input['deviceIp'] ?? '';
    $fw64 = $input['firmware'] ?? '';
    if (empty($deviceIp)) throw new Exception('deviceIp fehlt.');
    if (empty($fw64)) throw new Exception('firmware (Base64) fehlt.');

    $fwBin = base64_decode($fw64, true);
    if ($fwBin === false) throw new Exception('Ungültige Base64-Firmware.');

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
    if ($result === false) throw new Exception('Gerät nicht erreichbar: ' . $deviceIp);

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
    case 'firmwareUpdate':
        firmwareUpdateProxy($rest);
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
