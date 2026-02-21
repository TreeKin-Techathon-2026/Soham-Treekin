"""
AI Photo Validation for TreeKin.

Uses a local image classification model (via Hugging Face transformers)
to detect whether an uploaded photo contains a tree or plant.

Runs 100% offline — no API key, no internet after first model download.
Model: google/vit-base-patch16-224 (ImageNet-1k, ~330MB, downloads once)
"""

import os
from typing import Dict, Optional
from functools import lru_cache


# Keywords that indicate a tree/plant is present
TREE_KEYWORDS = {
    # Trees
    "tree", "oak", "palm", "pine", "maple", "willow", "birch", "cedar",
    "redwood", "sequoia", "cypress", "banyan", "fig", "acacia", "baobab",
    "eucalyptus", "mangrove", "mahogany", "teak", "ash",
    # Plants & vegetation
    "plant", "flower", "leaf", "garden", "bush", "hedge", "shrub",
    "sapling", "seedling", "sprout", "vine", "fern", "moss",
    "vegetation", "flora", "herb", "grass", "daisy", "rose",
    "sunflower", "tulip", "orchid", "poppy", "dandelion",
    # Fruits (tree-related)
    "coconut", "mango", "jackfruit", "fig", "lemon", "orange",
    "banana", "pineapple", "strawberry",
    # Places with trees
    "park", "forest", "jungle", "woodland", "grove", "orchard",
    "greenhouse", "nursery", "botanical", "lakeside", "valley",
    # Related objects
    "pot", "planter", "flowerpot", "vase",
}

# Keywords that indicate a FAKE or NON-TREE image
REJECT_KEYWORDS = {
    "monitor", "screen", "laptop", "television", "desktop", "computer",
    "ipod", "cellphone", "cell phone", "mobile phone", "smartphone",
    "mouse", "keyboard", "remote control", "joystick",
    "web site", "website", "menu", "envelope",
    "car", "truck", "bus", "train", "airplane", "airliner",
    "pizza", "hamburger", "hot dog", "ice cream", "cheeseburger",
    "printer", "photocopier", "cassette player",
}

# Minimum confidence for a SINGLE tree/plant label to accept
MIN_CONFIDENCE = 0.01  # ViT distributes scores across 1000 classes, so individual scores are low
# If cumulative tree-keyword score exceeds this, accept
CUMULATIVE_TREE_THRESHOLD = 0.03
# If a reject keyword is found above this, reject  
REJECT_CONFIDENCE = 0.15


@lru_cache(maxsize=1)
def _get_classifier():
    """Lazily load the image classification pipeline (cached, loads once)."""
    try:
        from transformers import pipeline
        print("[AI Validator] Loading image classification model (first time may take ~30s)...")
        classifier = pipeline(
            "image-classification",
            model="google/vit-base-patch16-224",
            device=-1  # CPU (use 0 for GPU if available)
        )
        print("[AI Validator] Model loaded successfully!")
        return classifier
    except Exception as e:
        print(f"[AI Validator] Failed to load model: {e}")
        return None


def validate_tree_photo(image_path: str, hf_token: Optional[str] = None) -> Dict:
    """
    Validate that an image contains a tree or plant.

    Args:
        image_path: Path to the saved image file
        hf_token: Not used for local inference (kept for API compatibility)

    Returns:
        {
            "valid": bool,
            "confidence": float,
            "label": str,
            "all_labels": list,
            "reason": str
        }
    """
    try:
        # Get the classifier (loads model on first call, cached after)
        classifier = _get_classifier()
        if classifier is None:
            return {
                "valid": True,
                "confidence": 0.0,
                "label": "model_unavailable",
                "all_labels": [],
                "reason": "AI validation skipped (model failed to load)"
            }

        # Run classification
        results = classifier(image_path, top_k=10)

        if not results:
            return {
                "valid": True,
                "confidence": 0.0,
                "label": "no_results",
                "all_labels": [],
                "reason": "AI validation skipped (no results)"
            }

        # Parse results
        all_labels = [
            {"label": r["label"].lower(), "score": round(r["score"], 4)}
            for r in results
        ]

        # Check for reject keywords first
        for item in all_labels:
            label = item["label"]
            score = item["score"]
            for reject_kw in REJECT_KEYWORDS:
                if reject_kw in label and score >= REJECT_CONFIDENCE:
                    return {
                        "valid": False,
                        "confidence": score,
                        "label": label,
                        "all_labels": all_labels,
                        "reason": f"Image appears to be '{label}' (confidence: {score:.0%}), not a tree or plant."
                    }

        # Check for tree/plant keywords
        best_tree_match = None
        best_tree_score = 0.0
        cumulative_tree_score = 0.0

        for item in all_labels:
            label = item["label"]
            score = item["score"]
            for tree_kw in TREE_KEYWORDS:
                if tree_kw in label:
                    cumulative_tree_score += score
                    if score > best_tree_score:
                        best_tree_match = label
                        best_tree_score = score
                    break

        # Accept if best single label OR cumulative score is high enough
        if best_tree_match and (best_tree_score >= MIN_CONFIDENCE or cumulative_tree_score >= CUMULATIVE_TREE_THRESHOLD):
            return {
                "valid": True,
                "confidence": best_tree_score,
                "label": best_tree_match,
                "all_labels": all_labels,
                "reason": f"Tree/plant detected: '{best_tree_match}' (confidence: {best_tree_score:.0%}, cumulative: {cumulative_tree_score:.0%})"
            }

        # No tree found
        top_label = all_labels[0]["label"] if all_labels else "unknown"
        top_score = all_labels[0]["score"] if all_labels else 0
        return {
            "valid": False,
            "confidence": top_score,
            "label": top_label,
            "all_labels": all_labels,
            "reason": f"No tree or plant detected. Top result: '{top_label}' ({top_score:.0%}). "
                      f"Please upload a photo of your tree."
        }

    except Exception as e:
        print(f"[AI Validator] Error: {e}")
        return {
            "valid": True,
            "confidence": 0.0,
            "label": "error",
            "all_labels": [],
            "reason": f"AI validation skipped ({type(e).__name__})"
        }
