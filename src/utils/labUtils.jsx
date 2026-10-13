/**
 * Utility functions for laboratory result formatting and display
 */

/**
 * Returns a styled arrow component based on the direction of a lab result
 * @param {string} direction - The direction of the lab result ("elevated", "decreased", "normal", or other)
 * @returns {JSX.Element} A styled span element with appropriate arrow and color
 */
export const getArrowForDirection = (direction) => {
  switch (direction) {
    case "elevated":
      return <span className="qz-mark up">↑</span>;
    case "decreased":
      return <span className="qz-mark down">↓</span>;
    case "normal":
      return <span className="qz-mark same">→</span>;
    default:
      return <span className="qz-mark unknown">?</span>;
  }
};

export const getPosNeg = (direction) => {
  switch (direction) {
    case "positive":
      return <span className="qz-mark pos">+</span>;
    case "negative":
      return <span className="qz-mark neg">-</span>;
  }
};
