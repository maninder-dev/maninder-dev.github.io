// Copy only whitelisted, non-undefined fields from a request body
module.exports = function pick(source = {}, fields) {
  const out = {};
  for (const f of fields) if (source[f] !== undefined) out[f] = source[f];
  return out;
};

// Escape user input before using it inside a RegExp search
module.exports.escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
