// Plain JavaScript ping - no TypeScript
module.exports = async (req, res) => {
  res.json({ status: 'ok', message: 'Pure JS works!' });
};