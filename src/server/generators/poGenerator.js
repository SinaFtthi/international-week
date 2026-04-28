function getCurrentDateTime() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function generateRandomAmount() {
  return Math.floor(Math.random() * 500) + 1;
}

function generatePo(bankBic, beneficiaryBankBic) {
  return {
    po_id: `${bankBic}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    po_amount: generateRandomAmount(),
    po_message: "Test run generated PO",
    po_datetime: getCurrentDateTime(),
    ob_id: bankBic,
    oa_id: "BE111",
    ob_code: "2000",
    ob_datetime: getCurrentDateTime(),
    bb_id: beneficiaryBankBic,
    ba_id: "BE999"
  };
}

module.exports = { generatePo };