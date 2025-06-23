const loadMessages = async (locale) => {
  try {
    return (await import(`./messages/${locale}/index.json`)).default;
  } catch (error) {
    console.error(`Error loading messages for locale ${locale}:`, error);
    return {};
  }
};

module.exports = loadMessages;
