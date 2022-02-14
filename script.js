'use strict'
var binary;

const INSTRUCTION_LENGTH = 32;

// Add click listeners
window.addEventListener('load', () => {
    document.getElementById("calc").addEventListener('click', calculate);
    document.getElementById("calc").click();
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

// Perform initial computations for bit type and opcode
function calculate(evt) {
    let hex = evt.target.previousElementSibling.value;
    binary = extend(hex2bin(hex));
    document.getElementById("binaryOutput").value = binary;

    let opcode = getBits(binary, [[6,0]]);
    document.getElementById("opcode").value = opcode;

    let type = "";
    switch (opcode) {
        case "0110011":
            type = "R";
            break;
        case "0010011":
            type = "I";
            break;
        case "0100011":
            type = "S";
            break;
        case "0000011":
            type = "L";
            break;
        case "1100011":
            type = "SB";
            break;
        default:
            type = "INVALID";
            break;
    }
    document.getElementById("type").value = type;

    let cont = document.getElementById("format");
    while (cont.firstChild) cont.firstChild.remove();

    if (type !== "INVALID") processFields(type);
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

// Perform type-specific processing on bit pattern
function processFields(type) {
    switch (type) {
        case "R":
            addField("func7", [[31,25]]);
            addField("rs2", [[24, 20]]);
            addField("rs1", [[19, 15]]);
            addField("func3", [[14, 12]]);
            addField("rd", [[11, 7]]);
            break;
        case "I":
            let imm_I = getBits(binary, [[31, 20]]),
                immExtended_I = extend(imm_I, true);
            addField("imm", immExtended_I, true);
            addField("rs1", [[19, 15]]);
            addField("func3", [[14, 10]]);
            addField("rd", [[9, 6]]);
            break;
        case "SB":
            let imm_SB = getBits(binary, [[31],[7],[30,25],[11,8]])+'0',
                immExtended_SB = extend(imm_SB, true);
            console.log(imm_SB, immExtended_SB);
            addField("imm", immExtended_SB, true);
            addField("rs2", [[24, 20]]);
            addField("rs1", [[19, 15]]);
            addField("func3", [[14, 12]]);
            break;
    }
}

// Add label and associated text field for bits. 
// Will use custom bits from descriptor if isCustom is set
function addField(name, descriptor, isCustom) {
    let container = document.getElementById("format");
    container.appendChild(document.createTextNode(name+": "));
    
    let input = document.createElement("input");
    input.type = "text";
    input.id = name;
    input.disabled = true;
    input.classList.add("input");
    input.value = isCustom ? descriptor : getBits(binary, descriptor);

    container.appendChild(input);
    container.appendChild(document.createElement("br"));
}