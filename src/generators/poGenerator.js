function generateRandomId() {
  return "PO_" + Math.floor(Math.random() * 100000);
}

function generateRandomAmount() {
  return Math.floor(Math.random() * 500) + 1; // tussen 1 en 500
}

function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace("T", " ");
}

function generatePo() {
  return {
    po_id: generateRandomId(),
    po_amount: generateRandomAmount(),
    po_message: "Test run",
    po_datetime: getCurrentDateTime(),
    ob_id: "BIBLBE21",
    oa_id: "BE111",
    ob_code: "2000",
    ob_datetime: getCurrentDateTime(),
    bb_id: "BCMCBEBB",
    ba_id: "BE999"
  };
}

const pos = [
  generatePo(),
  generatePo(),
  generatePo()
];

console.log(pos);