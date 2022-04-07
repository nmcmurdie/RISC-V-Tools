'use strict'
const INSTRUCTION_LENGTH = 32, R_OPCODE = "0110011", I_OPCODE = "0010011", 
        S_OPCODE = "0100011", L_OPCODE = "0000011", SB_OPCODE = "1100011",
        U_OPCODE = "0110111";
const UNIT_OPTIONS = ["Binary", "Hex", "Unsigned Decimal", "Signed Decimal"];
const BASE_UNITS = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
const SIGNED = true, UNSIGNED = false, SIGN_EXTEND = true;
const PARSE_MSG = ["Tag:", "Index:", "Offset:"];

var binary, prevType;

// Add click listeners
window.addEventListener('load', () => {
    document.getElementById("calc").addEventListener('click', calculate);
    document.getElementById("convertSubmit").addEventListener('click', convert);
    document.getElementById("hammingSubmit").addEventListener('click', hammingConvert);
    document.querySelectorAll(".ripple").forEach(addRipplesTo);
    let ISA = document.getElementById("link_isa");
    addTooltip(ISA, "Instruction Set");
});

// Determine if digit would be negative in 2s complement given the base
function hasNegative(digit, fromBase) {
    if (typeof digit === 'string') digit = BASE_UNITS.indexOf(digit);
    return digit >= fromBase / 2;
}

// Convert number in any base to decimal
// if isSigned then original base was in 2s complement
function convertToDec(numStr, fromBase, isSigned, isNegative) {
    let factor = 1, decimal = 0;

    // Parse decimal
    for (let i = numStr.length - 1; i >= 0; i--) {
        let digit = numStr[i];
        let num = BASE_UNITS.indexOf(digit);
        
        if (i === 0 && isSigned && hasNegative(num, fromBase)) {
            // Left-most bit in binary would be a 1, make negative
            num *= -1;
        }

        decimal += factor * num;
        factor *= fromBase;
    }

    return isNegative ? -decimal : decimal;
}

// Determine how many bits are needed to represent a given decimal
function decBits(decimal) {
    return Math.ceil(Math.log(Math.abs(decimal)) / Math.LN2) + 1;
}

// Convert given decimal to the decimal equivalent of the signed binary representation
function decToSigned(decimal) {
    let bits = decBits(decimal);
    let factor = Math.pow(2, bits - 1), 
        target = decimal,
        value = -factor;

    decimal = factor;

    // Build signed binary and compute new decimal value
    for (let i = bits - 2; i >= 0; i--) {
        factor /= 2;

        if (value + factor <= target) {
            value += factor;
            decimal += factor;
        }
    }

    return decimal;
}

// Convert decimal (signed or unsigned) to specified base
function decToBase(decimal, toBase) {
    let result = "";

    // Divide decimal by base to convert
    while (decimal > 0) {
        result = BASE_UNITS[decimal % toBase] + result;
        decimal = Math.floor(decimal / toBase);
    }

    return result;
}

// Convert a number from base 'fromBase' to base 'toBase'
// isSigned determines whether or not initial number was signed
function convertBase(numStr, fromBase, toBase, isSigned) {
    let isNegative = false, isHexSigned = 0;

    if (numStr[0] === '-') {
        // Number is negative, only process numeric portion
        isNegative = true;
        numStr = numStr.substring(1);
    }
    if (numStr.substring(0, 2) === "0x") numStr = numStr.substring(2);
    if (numStr[0] === '0') isSigned = UNSIGNED;
    numStr = numStr.toLowerCase();

    if (fromBase === 16 && isSigned) {
        // Can't convert from signed hex properly, convert to unsigned binary first
        isHexSigned = toBase;
        toBase = 2;
        isSigned = UNSIGNED;
    }

    let decimal = convertToDec(numStr, fromBase, isSigned, isNegative);
    if (toBase === 10) return decimal;
    else if (decimal < 0) decimal = decToSigned(decimal);

    let result = decToBase(decimal, toBase);
    if (isHexSigned > 0) {
        // Convert and sign extend unsigned binary from the signed hex back into signed, intended base
        result = extend(result, decBits(decimal), hasNegative(numStr[0], fromBase));
        return convertBase(result, 2, isHexSigned, SIGNED);
    }

    return result;
}

// Convert the units given in the 'convert' fields
function convert() {
    let input = document.getElementById('convertInput').value;
    let fromBase = document.getElementById('convertFrom').value;
    let toBase = document.getElementById('convertTo').value;
    let sign = document.getElementById("convertSigned").checked;

    let outputField = document.getElementById('convertOutput');
    let output = convertBase(input, +fromBase, +toBase, sign);
    outputField.value = output;
}

// Parse a memory address in hex given the number of index bits and offset bits
function parseAddress(addr, indexBits, offsetBits) {
    if (addr.substring(0, 2) == "0x") addr = addr.substring(2);
    let length = addr.length * 4,
        tagBits = length - indexBits - offsetBits;
    const binary = extend(convertBase(addr, 16, 2, UNSIGNED), length);
    const bitLengths = [tagBits, indexBits, offsetBits];
    for (let bit = length - 1, m = 0; m < 3; m++) {
        let numBits = bitLengths[m];
        let bits = getBits(binary, [[bit, bit - numBits + 1]]);
        let dec = convertBase(bits, 2, 10, UNSIGNED);
        console.log(`${PARSE_MSG[m]} ${dec}`);
        bit -= numBits;
    }
}

// Parse a set of memory addresses, same format as parseAddress
function parseAddressSet(set, indexBits, offsetBits) {
    set.forEach(addr => {
        console.log("\n*** %s ***", addr);
        parseAddress(addr, indexBits, offsetBits);
    });
}

const isPowerOf2 = x => (Math.log(x) / Math.LN2 % 1) == 0;

// Determine parity bits from input
function hammingConvert() {
    let input = document.getElementById("hammingInput").value;
    let numParityBits = Math.log(input.length) / Math.LN2 + 1,
        length = input.length + numParityBits;
    let combinedStr = [], parityStr = "";

    for (let i = 1, j = 0; i < length + 1; i++) {
        combinedStr.push(isPowerOf2(i) ? 'x' : +input[j++]);
    }
    
    // Determine the parity bits
    for (let i = 0; i < numParityBits; i++) {
        let value = 0;

        // XOR each bit corresponding to the parity bit
        for (let j = 0; j < length; j++) {
            let bin = decToBase(j + 1, 2);
            
            // Bit has a 1 in the same position as the parity bit and isn't a parity bit itself
            if (bin[bin.length - 1 - i] === '1' && !isPowerOf2(j + 1))
                value ^= combinedStr[j];
        }

        parityStr += value;
        combinedStr[Math.pow(2, i) - 1] = value;
    }

    document.getElementById("hammingOutput").value = parityStr;
    document.getElementById("hammingOutputFull").value = combinedStr.join('');
}

// Extend binary to 32 bits, sign extend if isSignExtend
function extend(bin, length, isSignExtend) {
    let numBits = length - bin.length;
    let extendStr = "",
        extendBit = isSignExtend ? bin[0] : '0';

    for (let i = 0; i < numBits; i++) {
        extendStr += extendBit;
    }

    return extendStr + bin;
}

// Retrieve bits from binary string given descriptor
function getBits(binStr, descriptor) {
    let bits = binStr.split('');
    let response = [];
    let len = binStr.length - 1;

    for (let i = 0; i < descriptor.length; i++) {
        let query = descriptor[i];
        if (query.length === 1) {
            // Single bit query
            let res = bits[len - query[0]];
            response.push(res);
        }
        else {
            // Range query
            let start = len - query[0],
                end = len - query[1];
            
            for (let i = start; i <= end; i++) {
                response.push(bits[i]);
            }
        }
    }

    return response.join('');
}

// Perform initial computations for bit type and opcode
function calculate(evt) {
    let hex = document.getElementById("input").value.trim();
    if (hex.length === 0) return;

    binary = extend(convertBase(hex, 16, 2, UNSIGNED), INSTRUCTION_LENGTH);
    document.getElementById("binaryOutput").value = binary;

    let opcode = getBits(binary, [[6,0]]);
    document.getElementById("opcode").value = opcode;

    let type = "";
    switch (opcode) {
        case R_OPCODE:
            type = "R";
            break;
        case I_OPCODE:
            type = "I";
            break;
        case S_OPCODE:
            type = "S";
            break;
        case L_OPCODE:
            type = "L";
            break;
        case SB_OPCODE:
            type = "SB";
            break;
        case U_OPCODE:
            type = "U";
            break;
        default:
            type = "INVALID";
            break;
    }
    document.getElementById("type").value = type;

    if (type !== prevType) {
        let cont = document.getElementById("format");
        while (cont.firstChild) cont.firstChild.remove();
    }

    if (type !== "INVALID") processFields(type);
}

// Perform type-specific processing on bit pattern
function processFields(type) {
    let sameType = type === prevType;

    switch (type) {
        case "R":
            let func_r = getInstruction(type,[[14,12],[31,25]]);
            addField("name", func_r, sameType);
            addField("func7", [[31,25]], sameType);
            addField("rs2", [[24, 20]], sameType);
            addField("rs1", [[19, 15]], sameType);
            addField("func3", [[14, 12]], sameType);
            addField("rd", [[11, 7]], sameType);
            break;
        case "L":
        case "I":
            let imm_I = getBits(binary, [[31, 20]]),
                immExtended_I = extend(imm_I, INSTRUCTION_LENGTH, SIGN_EXTEND);
            let func_i = getInstruction(type,[[14,12]]);
            addField("name", func_i, sameType);
            addField("imm", immExtended_I, sameType);
            addField("rs1", [[19, 15]], sameType);
            addField("func3", [[14, 12]], sameType);
            addField("rd", [[11, 7]], sameType);
            break;
        case "S":
            let imm_S = getBits(binary, [[31, 25], [11, 7]]),
                immExtended_S = extend(imm_S, INSTRUCTION_LENGTH, SIGN_EXTEND);
            let func_s = getInstruction(type,[[14,12]]);
            addField("name", func_s, sameType);
            addField("imm", immExtended_S, sameType);
            addField("rs2", [[24, 20]], sameType);
            addField("rs1", [[19, 15]], sameType);
            addField("func3", [[14, 12]], sameType);
            break;
        case "SB":
            let imm_SB = getBits(binary, [[31],[7],[30,25],[11,8]])+'0',
                immExtended_SB = extend(imm_SB, INSTRUCTION_LENGTH, SIGN_EXTEND);
            let func_sb = getInstruction(type,[[14,12]]);
            addField("name", func_sb, sameType);
            addField("imm", immExtended_SB, sameType);
            addField("rs2", [[24, 20]], sameType);
            addField("rs1", [[19, 15]], sameType);
            addField("func3", [[14, 12]], sameType);
            break;
        case "U":
            let imm_U = getBits(binary, [[31, 12]]);
            while (imm_U.length < 32) imm_U += '0';
            addField("imm", imm_U, sameType);
            addField("rd", [[11, 7]], sameType);
    }

    prevType = type;
}

// Add label and associated text field for bits. 
// Will use custom bits from descriptor if descriptor is not a string
// Will utilize old field if isCreated is true
function addField(name, descriptor, isCreated) {
    let isCustom = typeof descriptor === 'string';
    let input;

    if (isCreated) {
        input = document.getElementById(name);
    }
    else {
        input = constructField(name);
    }

    input.value = isCustom ? descriptor : getBits(binary, descriptor);
    input.setAttribute("binary", input.value);
    unitConvert(input);
}

function getDefaultUnits(name) {
    switch (name) {
        case "imm":
            return "Signed Decimal";
        case "rs1":
        case "rs2":
        case "rd":
            return "Unsigned Decimal";
        default:
            return "Binary";
    }
}

// Create a new field from scratch following format of addField
function constructField(name) {
    // Label
    let label = document.createElement("span");
    label.classList.add("value-label");
    label.appendChild(document.createTextNode(name+":"));
    
    // Dropdown list
    let select = document.createElement("select");
    select.classList.add("value-select");
    UNIT_OPTIONS.forEach(opt => {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(opt));
        select.appendChild(option);
    });
    select.value = getDefaultUnits(name);
    select.addEventListener("change", evt => {
        unitConvert(evt.target.previousElementSibling);
    })
    
    // Input field
    let input = document.createElement("input");
    input.type = "text";
    input.id = name;
    input.disabled = true;
    input.classList.add("input");

    let container = document.getElementById("format");
    let valueGroup = document.createElement("div");
    valueGroup.classList.add("value-group");
    valueGroup.appendChild(label);
    valueGroup.appendChild(input);
    container.appendChild(valueGroup);
    if (name !== "name") valueGroup.appendChild(select);
    else container.appendChild(document.createElement("br"));

    return input
}

// Convert the specified input field to the units selected in the dropdown
function unitConvert(input) {
    let unit = input.nextElementSibling;
    let binary = input.getAttribute("binary");
    
    if (unit) switch (unit.value) {
        case "Binary":
            input.value = binary;
            break;
        case "Hex":
            input.value = convertBase(binary, 2, 16, UNSIGNED);
            break;
        case "Unsigned Decimal":
            input.value = convertBase(binary, 2, 10, UNSIGNED);
            break;
        case "Signed Decimal":
            input.value = convertBase(binary, 2, 10, SIGNED);
            break;
    }
}

// Get instruction name from instruction type + func bits
function getInstruction(code, descriptor) {
    let instrCode = code + getBits(binary, descriptor);

    // Format: type + func3 + func7 (<- only R)
    switch (instrCode) {
        // L-type
        case "L000": return "lb";
        case "L001": return "lh";
        case "L010": return "lw";
        case "L011": return "ld";
        case "L100": return "lbu";
        case "L101": return "lhu";
        case "L110": return "lwu";

        // I-type
        case "I000": return "addi";
        case "I001": return "slli";
        case "I010": return "slti";
        case "I011": return "sltiu";
        case "I100": return "xori";
        case "I101": return "srli or srai";
        case "I110": return "ori";
        case "I111": return "andi";

        // S-type
        case "S000": return "sb";
        case "S001": return "sh";
        case "S010": return "sw";
        case "S011": return "sd";

        // R-type
        case "R0000000000": return "add";
        case "R0000100000": return "sub";
        case "R0010000000": return "sll";
        case "R0100000000": return "slt";
        case "R0110000000": return "sltu";
        case "R1000000000": return "xor";
        case "R1010000000": return "srl";
        case "R1010100000": return "sra";
        case "R1100000000": return "or";
        case "R1110000000": return "and";

        // SB-type
        case "SB000": return "beq";
        case "SB001": return "bne";
        case "SB100": return "blt";
        case "SB101": return "bge";
        case "SB110": return "bltu";
        case "SB111": return "bgeu";

        default: return "UNKNOWN";
    }
}