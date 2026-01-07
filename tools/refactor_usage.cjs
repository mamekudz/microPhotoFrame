const fs = require('fs');
const path = require('path');

// Mapping von alten zu neuen Methoden-Namen (PascalCase)
const replacements = {
    'isIntersection': 'IsIntersection',
    'containsAll': 'ContainsAll',
    'addJSON': 'AddJSON',
    'removeElement': 'RemoveElement',
    'cleanMultiple': 'CleanMultiple',
    'removeElements': 'RemoveElements',
    'removeAt': 'RemoveAt',
    'kjoin': 'Kjoin',
    'copy': 'Copy',
    'isEqualTo': 'IsEqualTo',
    'merge': 'Merge',
    'toObject': 'ToObject',
    'integerContent': 'IntegerContent',
    'moveUp': 'MoveUp',
    'moveDown': 'MoveDown',
    'moveEnd': 'MoveEnd',
    'moveBegin': 'MoveBegin',
    'insertAt': 'InsertAt',
    'toInt': 'ToInt',
    'first': 'First',
    'joinWithoutEmpty': 'JoinWithoutEmpty',
    'toBase64': 'ToBase64',
    'jsonParse': 'JsonParse',
    'jsonParseExtended': 'JsonParseExtended',
    'i18xGetContext': 'I18xGetContext',
    'i18xRemoveContext': 'I18xRemoveContext',
    'i18xTrans': 'I18xTrans',
    'i18xTransHtmlEntities': 'I18xTransHtmlEntities',
    'i18xRawTrans': 'I18xRawTrans',
    'i18xOpaqueTrans': 'I18xOpaqueTrans',
    'i18xRegister': 'I18xRegister',
    'i18xOpaqueRegister': 'I18xOpaqueRegister',
    'i18xKey': 'I18xKey',
    'i18xNotationNormalizeTranslation': 'I18xNotationNormalizeTranslation',
    'i18xNotationGet': 'I18xNotationGet',
    'i18xReNotation': 'I18xReNotation',
    'format': 'Format',
    'wordHyphenation': 'WordHyphenation',
    'hyphenation': 'Hyphenation',
    'flagEmojiOfCountryCode': 'FlagEmojiOfCountryCode',
    'flagEmojiOfLanguageCode': 'FlagEmojiOfLanguageCode',
    'releaseDate2DateTime': 'ReleaseDate2DateTime',
    'releaseDateYear': 'ReleaseDateYear',
    'preZero': 'PreZero',
    'sysClp': 'SysClp',
    'frac': 'Frac',
    'clamp': 'Clamp',
    'parseInt': 'ParseInt',
    'parseFloat': 'ParseFloat',
    'htmlEntities': 'HtmlEntities',
    'toRoman': 'ToRoman',
    'log': 'Log',
    'radians2Degrees': 'Radians2Degrees',
    'degrees2Radians': 'Degrees2Radians',
    'isFloat': 'IsFloat',
    'bitSetByBool': 'BitSetByBool',
    'padStart': 'PadStart',
    'dateOfTicks': 'DateOfTicks',
    'ticks': 'Ticks',
    'ticksToMilliSeconds': 'TicksToMilliSeconds',
    'convertTicksToLocalTime': 'ConvertTicksToLocalTime',
    'ticks2UTCDateStr': 'Ticks2UTCDateStr',
    'formatTimestamp': 'FormatTimestamp',
    'formatTicks': 'FormatTicks',
    'setTicks': 'SetTicks',
    'convertUtcToLocal': 'ConvertUtcToLocal',
    'timestamp': 'Timestamp',
    'localTimestamp': 'LocalTimestamp',
    'asLocalTime': 'AsLocalTime',
    'utcDateAsLocalDate': 'UtcDateAsLocalDate',
    'startOfDay': 'StartOfDay',
    'toLocalTime': 'ToLocalTime',
    'millisecondsFrom': 'MillisecondsFrom',
    'setTimestamp': 'SetTimestamp',
    'getWeekOfYear': 'GetWeekOfYear',
    'getDayOfYear': 'GetDayOfYear',
    'getLastDayOfMonthUTCDate': 'GetLastDayOfMonthUTCDate',
    'getUpToNowTicks': 'GetUpToNowTicks',
    'getHoliday': 'GetHoliday',
    'resize': 'Resize',
    'distanceTo': 'DistanceTo',
    'move': 'Move',
    'levelKey': 'LevelKey',
    'set': 'Set',
    'get': 'Get',
    'remove': 'Remove',
    'toWaveDataURL': 'ToWaveDataURL',
    'toMP3DataURL': 'ToMP3DataURL',
};

function processDirectory(dir, extensions = ['.js', '.mjs', '.jsx', '.tsx']) {
    const filesToProcess = [];
    
    function walk(currentPath) {
        const items = fs.readdirSync(currentPath);
        
        items.forEach(item => {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Skip node_modules, .git, dist, build, etc.
                if (!['node_modules', '.git', 'dist', 'build', '.next', '.venv', 'venv'].includes(item)) {
                    walk(fullPath);
                }
            } else if (extensions.some(ext => item.endsWith(ext))) {
                filesToProcess.push(fullPath);
            }
        });
    }
    
    walk(dir);
    return filesToProcess;
}

const rootDir = path.join(__dirname, 'src');
const firmwareDir = path.join(__dirname, 'firmware', 'src');
const files = [
    ...processDirectory(rootDir),
    ...processDirectory(firmwareDir),
];

let updatedCount = 0;

files.forEach(filePath => {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // Replace all occurrences
        for (const [oldName, newName] of Object.entries(replacements)) {
            if (oldName === newName) continue;
            
            // Match method calls with different patterns
            const callRegex = new RegExp(`\\.${oldName}\\(`, 'g');
            content = content.replace(callRegex, `.${newName}(`);
        }
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Updated: ${path.relative(__dirname, filePath)}`);
            updatedCount++;
        }
    } catch (err) {
        console.error(`✗ Error processing ${filePath}:`, err.message);
    }
});

console.log(`\n✓ Refactoring complete! Updated ${updatedCount} files.`);
