'use strict'
const INSTRUCTION_LENGTH = 32, R_OPCODE = "0110011", I_OPCODE = "0010011", 
        S_OPCODE = "0100011", L_OPCODE = "0000011", SB_OPCODE = "1100011";
const UNIT_OPTIONS = ["Binary", "Hex", "Unsigned Decimal", "Signed Decimal"];

var binary, prevType;

// Add click listeners
window.addEventListener('load', () => {
    document.getElementById("calc").addEventListener('click', calculate);
});

function hex2bin(hex){
    return (parseInt(hex, 16).toString(2)).padStart(8, '0');
}

// Binary string to decimal, unsigned
function bin2decu(bin) {
    return parseInt(bin, 2);
}

// Binary string to 2s complement decimal
function bin2dec(bin) {
    let factor = 1,
        total = 0;

    for (let i = bin.length - 1; i >= 0; i--) {
        let digit = +bin[i] * factor;
        total += (i === 0) ? -digit : digit;
        factor *= 2;
    }

    return total;
}

function bin2hex(bin) {
    return parseInt(bin, 2).toString(16);
}

// Extend binary to 32 bits, sign extend with isSignExtend
function extend(bin, isSignExtend) {
    let numBits = INSTRUCTION_LENGTH - bin.length;
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
    let hex = evt.target.previousElementSibling.value.trim();
    if (hex.length === 0) return;

    binary = extend(hex2bin(hex));
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
            let func_r = getInstruction(type,[[31,25],[14,12]]);
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
                immExtended_I = extend(imm_I, true);
            let func_i = getInstruction(type,[[14,12]]);
            addField("name", func_i, sameType);
            addField("imm", immExtended_I, sameType);
            addField("rs1", [[19, 15]], sameType);
            addField("func3", [[14, 12]], sameType);
            addField("rd", [[11, 7]], sameType);
            break;
        case "SB":
            let imm_SB = getBits(binary, [[31],[7],[30,25],[11,8]])+'0',
                immExtended_SB = extend(imm_SB, true);
            let func_sb = getInstruction(type,[[14,12]]);
            addField("name", func_sb, sameType);
            addField("imm", immExtended_SB, sameType);
            addField("rs2", [[24, 20]], sameType);
            addField("rs1", [[19, 15]], sameType);
            addField("func3", [[14, 12]], sameType);
            break;
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

// Create a new field from scratch following format of addField
function constructField(name) {
    // Label
    let label = document.createElement("span");
    label.classList.add("value-label");
    label.appendChild(document.createTextNode(name+":"));
    
    // Dropdown list
    let select = document.createElement("select");
    UNIT_OPTIONS.forEach(opt => {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(opt));
        select.appendChild(option);
    });
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
    container.appendChild(label);
    container.appendChild(input);
    if (name !== "name") container.appendChild(select);
    container.appendChild(document.createElement("br"));

    return input
}

// Convert the specified input field to the units selected in the dropdown
function unitConvert(input) {
    let unit = input.nextElementSibling;
    let binary = input.getAttribute("binary");
    
    switch (unit.value) {
        case "Binary":
            input.value = binary;
            break;
        case "Hex":
            input.value = bin2hex(binary);
            break;
        case "Unsigned Decimal":
            input.value = bin2decu(binary);
            break;
        case "Signed Decimal":
            input.value = bin2dec(binary);
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