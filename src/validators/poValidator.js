function validatePaymentOrder(po) {
  if (!po.po_id) {
    return { ok: false, code: 4000, message: "Missing po_id" };
  }

  if (po.po_amount > 500) {
    return { ok: false, code: 4002, message: "Amount exceeds 500 euros" };
  }

  if (po.po_amount <= 0) {
    return { ok: false, code: 4003, message: "Amount must be positive" };
  }

  if (!po.ob_id) {
    return { ok: false, code: 4006, message: "Missing OB BIC" };
  }

  if (!po.bb_id) {
    return { ok: false, code: 4007, message: "Missing BB BIC" };
  }

  return { ok: true, code: 2000, message: "Validation passed" };
}

module.exports = { validatePaymentOrder };