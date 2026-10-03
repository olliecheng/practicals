function Home() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="text-left mb-12">
        <h1 className="font-serif text-4xl font-bold text-gray-800 mb-4">
          Practical test interpretation
        </h1>
        <p className="text-lg text-gray-600 font-light">
          Bite-sized, digestible interactive medical diagnostic tests and
          clinical decision-making.
        </p>
        <p className="text-sm text-gray-600 font-light">
          The level of difficulty is superficially adapted from the University
          of Melbourne MD1 curriculum and is not intended to be comprehensive.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <a
          href="/dexamethasone.html"
          className="flex flex-col justify-between h-full bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl hover:bg-white/95 transition-all duration-300 p-6 border border-gray-200/50"
        >
          <div className="flex justify-left mb-2 -ml-3">
            <img
              src="/cushing.jpg"
              alt="Cushing's syndrome test icon"
              className="w-32 h-32 object-contain"
            />
          </div>
          <h2 className="font-serif text-xl font-semibold text-gray-800 mb-3">
            Dexamethasone Suppression
          </h2>
          <div className="flex-grow">
            <p className="text-gray-600 leading-relaxed">
              Cushing's syndrome diagnosis using low and high dose dexamethasone
              suppression tests
            </p>
          </div>
          <div className="font-serif mt-4 text-blue-600 font-medium">
            Start Test →
          </div>
        </a>

        <a
          href="/parathyroid.html"
          className="flex flex-col justify-between h-full bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl hover:bg-white/95 transition-all duration-300 p-6 border border-gray-200/50"
        >
          <div className="flex justify-left mb-2 -ml-3">
            <img
              src="/parathyroid.jpg"
              alt="Parathyroid function test icon"
              className="w-32 h-32 object-contain"
            />
          </div>
          <h2 className="font-serif text-xl font-semibold text-gray-800 mb-3">
            Parathyroid Function
          </h2>
          <div className="flex-grow">
            <p className="text-gray-600 leading-relaxed">
              Parathyroid disorder diagnosis using calcium and PTH
            </p>
          </div>
          <div className="font-serif mt-4 text-blue-600 font-medium">
            Start Test →
          </div>
        </a>

        <a
          href="/hepatitis-b.html"
          className="flex flex-col justify-between h-full bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl hover:bg-white/95 transition-all duration-300 p-6 border border-gray-200/50"
        >
          <div className="flex justify-left mb-2 -ml-3">
            <img
              src="/hep_b.jpg"
              alt="Hepatitis B test icon"
              className="w-32 h-32 object-contain"
            />
          </div>
          <h2 className="font-serif text-xl font-semibold text-gray-800 mb-3">
            Hepatitis B Serology
          </h2>
          <div className="flex-grow">
            <p className="text-gray-600 leading-relaxed">
              Hepatitis B serology interpretation of HBsAg, Anti-HBc, Anti-HBs,
              and IgM Anti-HBc
            </p>
          </div>
          <div className="font-serif mt-4 text-blue-600 font-medium">
            Start Test →
          </div>
        </a>

        <a
          href="/liver-function.html"
          className="flex flex-col justify-between h-full bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl hover:bg-white/95 transition-all duration-300 p-6 border border-gray-200/50"
        >
          <div className="flex justify-left mb-2 -ml-3">
            <img
              src="/liver.jpg"
              alt="Liver function test icon"
              className="w-32 h-32 object-contain"
            />
          </div>
          <h2 className="font-serif text-xl font-semibold text-gray-800 mb-3">
            Liver Function Tests
          </h2>
          <div className="flex-grow">
            <p className="text-gray-600 leading-relaxed">
              Liver function test interpretation including ALT, AST, ALP, GGT,
              bilirubin, and albumin patterns
            </p>
          </div>
          <div className="font-serif mt-4 text-blue-600 font-medium">
            Start Test →
          </div>
        </a>

        <a
          href="/bacteria.html"
          className="flex flex-col justify-between h-full bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl hover:bg-white/95 transition-all duration-300 p-6 border border-gray-200/50"
        >
          <div className="flex justify-left mb-2 -ml-3">
            <img
              src="/bacteria.jpg"
              alt="Bacterial identification test icon"
              className="w-32 h-32 object-contain"
            />
          </div>
          <h2 className="font-serif text-xl font-semibold text-gray-800 mb-3">
            Bacterial Identification
          </h2>
          <div className="flex-grow">
            <p className="text-gray-600 leading-relaxed">
              Clinical microbiology identification using Gram stain, biochemical
              tests, and culture characteristics
            </p>
          </div>
          <div className="font-serif mt-4 text-blue-600 font-medium">
            Start Test →
          </div>
        </a>

        <a
          href="/recall-drill.html"
          className="flex flex-col justify-between h-full bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl hover:bg-white/95 transition-all duration-300 p-6 border border-gray-200/50"
        >
          <h2 className="font-serif text-xl font-semibold text-gray-800 mb-3">
            Recall Drill
          </h2>
          <div className="flex-grow">
            <p className="text-gray-600 leading-relaxed">
              History-taking recall drill
            </p>
          </div>
          <div className="font-serif mt-4 text-blue-600 font-medium">
            Start Drill →
          </div>
        </a>
      </div>
    </div>
  );
}

export default Home;
