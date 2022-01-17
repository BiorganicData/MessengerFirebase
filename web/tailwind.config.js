module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        lato: "'Lato', sans-serif",
      },
      gridTemplateRows: {
        main: '40px auto',
      },
      gridTemplateColumns: {
        main: '70px 250px auto',
        profile: '70px 250px auto 25%',
      },
      minHeight: {
        400: '400px',
      },
      maxHeight: {
        450: '450px',
        sm: '24rem',
      },
      maxWidth: {
        '3/4': '75%',
      },
      height: {
        550: '550px',
      },
    },
  },
  variants: {
    extend: {
      margin: ['first', 'last'],
      borderWidth: ['last'],
      borderRadius: ['last', 'first'],
      opacity: ['disabled'],
      width: ['group-hover'],
      display: ['group-hover'],
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
