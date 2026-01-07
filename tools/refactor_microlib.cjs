const fs = require('fs');
const path = require('path');

// Mapping von alten zu neuen Methoden-Namen (PascalCase)
const replacements = {
    // Array Methods
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
    // String Methods
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
    // Number Methods
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
    // Date Methods
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
    // Image Methods
    'resize': 'Resize',
    // Geo Methods
    'distanceTo': 'DistanceTo',
    'move': 'Move',
    // Storage Methods
    'levelKey': 'LevelKey',
    'set': 'Set',
    'get': 'Get',
    'remove': 'Remove',
    // WaveSound Methods
    'SetMP3Data': 'SetMP3Data', // Bereits groß
    'GetAudioFormat': 'GetAudioFormat', // Bereits groß
    'MonoIntData': 'MonoIntData', // Bereits groß
    'LeftIntData': 'LeftIntData', // Bereits groß
    'RightIntData': 'RightIntData', // Bereits groß
    'CreateNew': 'CreateNew', // Bereits groß
    'Compare': 'Compare', // Bereits groß
    'Overwrite': 'Overwrite', // Bereits groß
    'SetZeroLine': 'SetZeroLine', // Bereits groß
    'toWaveDataURL': 'ToWaveDataURL',
    'toMP3DataURL': 'ToMP3DataURL',
    'SeparateStereo': 'SeparateStereo', // Bereits groß
    'Convert': 'Convert', // Bereits groß
    'Load': 'Load', // Bereits groß
    // SoundTools Methods
    'ConvertClassicsSoundFilesToWaveSound': 'ConvertClassicsSoundFilesToWaveSound', // Bereits groß
    'LoadWaveSounds': 'LoadWaveSounds', // Bereits groß
    'ConvertSoundSequence2SoundAtlas': 'ConvertSoundSequence2SoundAtlas', // Bereits groß
    'CreateGlobalSoundAtlas': 'CreateGlobalSoundAtlas', // Bereits groß
    'ExtractAudioBuffer': 'ExtractAudioBuffer', // Bereits groß
    // GeolocationPosition
    'getHoliday': 'GetHoliday',
};

const microLibDir = path.join(__dirname, 'src', 'microLib');

fs.readdirSync(microLibDir).forEach(file => {
    if (!file.endsWith('.mjs')) return;
    
    const filePath = path.join(microLibDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace all occurrences
    for (const [oldName, newName] of Object.entries(replacements)) {
        if (oldName === newName) continue; // Skip if already correct
        
        // Match prototype definitions and calls
        const regex = new RegExp(`\\.${oldName}\\s*=`, 'g');
        content = content.replace(regex, `.${newName} =`);
        
        // Also match method calls
        const callRegex = new RegExp(`\\.${oldName}\\(`, 'g');
        content = content.replace(callRegex, `.${newName}(`);
    }
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${file}`);
    }
});

console.log('\n✓ Refactoring complete!');
