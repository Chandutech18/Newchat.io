const Spinner = ({ size = 'md', color = 'violet' }) => {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
  const colors = { violet: 'border-violet-500', white: 'border-white', gray: 'border-gray-400' };
  return (
    <div className={`${sizes[size]} ${colors[color]} border-t-transparent rounded-full animate-spin`} />
  );
};

export default Spinner;
