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

function bin2dec(bin) {
    return parseInt(bin, 2);
}

function bin2hex(bin) {
    return parseInt(bin, 2).toString(16);
}

function zeroExtend(bin) {
    let numZeros = INSTRUCTION_LENGTH - bin.length;
    let zeroStr = "";
    for (let i = 0; i < numZeros; i++) {
        zeroStr += '0';
    }
    return zeroStr + bin;
}

// Perform initial computations for bit type and opcode
function calculate(evt) {
    let hex = evt.target.previousElementSibling.value;
    binary = zeroExtend(hex2bin(hex));
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
            imm = binary.substring(0, 12);
            rs1 = binary.substring(12, 17);
            func3 = binary.substring(17,20);
            rd = binary.substring(20, 25);
            for (let i = 0; i < 20; i++) {
                immStr += imm[0];
            }
            immStr += imm;
            addField("imm", immStr);
            addField("rs1", rs1+"  =  "+bin2dec(rs1));
            addField("func3", func3+"  =  "+bin2dec(func3));
            addField("rd", rd+"  =  "+bin2dec(rd));
            break;
        case "SB":
            let imm12 = binary.substring(0, 1);
            let imm105 = binary.substring(1,7);
            console.log(imm12, imm105);
            rs2 = binary.substring(7,12);
            addField("rs2", rs2);
            rs1 = binary.substring(12,17);
            addField("rs1", rs1);
            func3 = binary.substring(17,20);
            addField("func3", func3);
            let imm41 = binary.substring(20, 24);
            let imm11 = binary.substring(24, 25);
            for (let i = 0; i < 19; i++) {
                immStr += imm12;
            }
            addField("imm", immStr+imm12+imm11+imm105+imm41+"0");
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