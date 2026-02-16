import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Deep link handler for /card/:id
 * Redirects to home page with cardId in the URL hash so Index can open it.
 */
export default function CardDeepLink() {
  const { cardId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to home with the card ID as a query param
    navigate(`/?openCard=${cardId}`, { replace: true });
  }, [cardId, navigate]);

  return null;
}
