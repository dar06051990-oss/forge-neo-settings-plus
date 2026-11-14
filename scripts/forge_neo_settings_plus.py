"""Forge Neo Settings++ v0.2.6.

Adds native Settings options without changing Forge core files:
- live preview of Extra Networks card icon size (handled by accompanying JS)
- UI-reload-time maximum for the native txt2img/img2img width/height sliders
- Extra Networks card/list/privacy visual options handled by extension JavaScript

The ui-config.json integration is necessary because Forge applies per-component
saved defaults *after* each slider is constructed. We patch that last point,
without rewriting the user's ui-config.json.
"""

from functools import wraps

import gradio as gr
from modules import script_callbacks, shared, ui_loadsave


VERSION = "0.2.6"
SECTION = ("forge_neo_settings_plus", "Forge Neo Settings++")
VALID_MAXIMUMS = {2048, 4096, 8192}
NATIVE_DIMENSION_IDS = frozenset((
    "txt2img_width",
    "txt2img_height",
    "img2img_width",
    "img2img_height",
))


def register_settings():
    """Add options to Forge's existing Settings interface."""
    shared.opts.add_option(
        "fns_card_icon_size",
        shared.OptionInfo(
            16,
            "Card Icon Size (px)",
            gr.Slider,
            {"minimum": 10, "maximum": 32, "step": 1},
            section=SECTION,
            category_id="ui",
        ).info("Preview changes instantly; click Apply settings to save."),
    )

    shared.opts.add_option(
        "fns_max_resolution",
        shared.OptionInfo(
            0,
            "Maximum Resolution (Width / Height)",
            gr.Radio,
            {
                "choices": [
                    ("Forge defaults", 0),
                    ("2048 px", 2048),
                    ("4096 px (4K)", 4096),
                    ("8192 px (8K)", 8192),
                ],
            },
            section=SECTION,
            category_id="ui",
        ).info("Native txt2img / img2img Width and Height sliders only.").needs_reload_ui(),
    )


    # Extra Networks display mode is controlled only by the quick toolbar icons.
    # Each category remembers its selection in browser localStorage.

    shared.opts.add_option(
        "fns_extra_label_position",
        shared.OptionInfo(
            "overlay", "Card Name Position", gr.Radio,
            {"choices": [("Over preview", "overlay"), ("Below preview", "below"),
                         ("Only on hover", "hover")]},
            section=SECTION, category_id="ui",
        ).info("Applies to Cards mode; names remain visible in No Preview and List."),
    )

    shared.opts.add_option(
        "fns_extra_name_lines",
        shared.OptionInfo(
            "2", "Card Name Lines", gr.Radio,
            {"choices": [("1", "1"), ("2", "2"), ("Full name", "full")]},
            section=SECTION, category_id="ui",
        ).info("Show one, two or all lines; full names may cover more of the preview."),
    )

    shared.opts.add_option(
        "fns_extra_card_gap",
        shared.OptionInfo(
            8, "Card Spacing (px)", gr.Slider,
            {"minimum": 0, "maximum": 24, "step": 1},
            section=SECTION, category_id="ui",
        ).info("Space between Extra Networks cards and list rows."),
    )

    shared.opts.add_option(
        "fns_extra_columns",
        shared.OptionInfo(
            "0", "Cards per Row", gr.Radio,
            {"choices": [("Automatic", "0"), ("2", "2"), ("3", "3"),
                         ("4", "4"), ("5", "5"), ("6", "6")]},
            section=SECTION, category_id="ui",
        ).info("Limit Cards to N per row without enlarging native Forge preview sizes; list mode stays one column."),
    )

    shared.opts.add_option(
        "fns_extra_aspect_ratio",
        shared.OptionInfo(
            "native", "Card Aspect Ratio", gr.Radio,
            {"choices": [("Forge defaults", "native"), ("Square", "square"),
                         ("Portrait (3:4)", "portrait"), ("Landscape (16:9)", "landscape")]},
            section=SECTION, category_id="ui",
        ).info("Overrides card height only, without modifying Forge's saved card-size settings."),
    )

    shared.opts.add_option(
        "fns_extra_preview_fit",
        shared.OptionInfo(
            "cover", "Preview Fitting", gr.Radio,
            {"choices": [("Fill / crop", "cover"), ("Show full image", "contain")]},
            section=SECTION, category_id="ui",
        ).info("Full image mode keeps image proportions without cropping."),
    )

    shared.opts.add_option(
        "fns_extra_hover_zoom",
        shared.OptionInfo(
            False, "Slightly Enlarge Preview on Hover", gr.Checkbox,
            section=SECTION, category_id="ui",
        ).info("Only affects Cards mode; never displays previews in hidden or list mode."),
    )


def get_selected_maximum():
    """Zero means 'leave Forge's own limits and ui-config values alone'."""
    try:
        value = int(getattr(shared.opts, "fns_max_resolution", 0))
    except (TypeError, ValueError):
        return 0
    return value if value in VALID_MAXIMUMS else 0


def patch_native_slider_maximum():
    """Apply our maximum after Forge has restored values from ui-config.json.

    Forge's UiLoadsave.add_component() assigns saved maximum values after it
    constructs the native sliders, so a before/after-component callback alone
    would be overruled. This wrapper only touches the four native sliders.
    """
    cls = ui_loadsave.UiLoadsave
    original = cls.add_component
    if getattr(original, "_forge_neo_settings_plus_wrapped", False):
        return

    @wraps(original)
    def add_component_with_maximum(self, path, component):
        result = original(self, path, component)

        elem_id = getattr(component, "elem_id", None)
        if elem_id not in NATIVE_DIMENSION_IDS or not isinstance(component, gr.Slider):
            return result

        chosen = get_selected_maximum()
        if not chosen:
            return result

        component.maximum = chosen
        # ui-config.json may contain a saved default value above the new cap.
        current_value = getattr(component, "value", None)
        if isinstance(current_value, (int, float)) and current_value > chosen:
            component.value = chosen
        return result

    add_component_with_maximum._forge_neo_settings_plus_wrapped = True
    cls.add_component = add_component_with_maximum


script_callbacks.on_ui_settings(register_settings)
patch_native_slider_maximum()
