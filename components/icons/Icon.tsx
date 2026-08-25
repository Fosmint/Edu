import Svg, { Path, Circle, Line, Polyline, Rect, G } from "react-native-svg";
import { colors } from "../theme";

/**
 * Единый набор line-иконок приложения.
 * Стиль: минималистичные геометрические формы, единая толщина обводки (stroke),
 * без заливки (кроме нескольких статусных точек), 24x24 viewBox по умолчанию.
 *
 * Использование: <Icon name="trophy" size={20} color={colors.textPrimary} />
 */

export type IconName =
  // навигация / табы
  | "home"
  | "books"
  | "chart"
  | "settings"
  // главный экран
  | "wave"
  | "flame"
  | "pencil"
  | "pin"
  | "lightbulb"
  | "dice"
  | "lifebuoy"
  // предметы
  | "calculator"
  | "letter-ru"
  | "letter-en"
  | "flask"
  | "atom"
  // статусы тем / сложность
  | "lock"
  | "circle-outline"
  | "circle-dot"
  | "check-circle"
  | "circle-filled-green"
  | "circle-filled-yellow"
  | "circle-filled-red"
  | "skull"
  // действия
  | "sword"
  | "close"
  | "send"
  | "check"
  | "x-circle"
  | "confused"
  | "chevron-up"
  | "chevron-down"
  | "plus"
  | "trash"
  // достижения
  | "flag"
  | "trophy"
  | "bolt"
  | "target"
  | "star"
  | "sparkle-star"
  | "muscle";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = colors.textPrimary, strokeWidth = 1.8 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
  };
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <Svg {...common}>
          <Path d="M3.5 11L12 4l8.5 7" {...stroke} />
          <Path d="M5.5 9.5V19a1 1 0 0 0 1 1H10v-5a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v5h3.5a1 1 0 0 0 1-1V9.5" {...stroke} />
        </Svg>
      );

    case "books":
      return (
        <Svg {...common}>
          <Path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H9a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" {...stroke} />
          <Path d="M13 4.2 16.8 3a1 1 0 0 1 1.26.66l4.62 15.15a1 1 0 0 1-.66 1.25l-3.42 1.05a1 1 0 0 1-1.25-.66L13 4.85" {...stroke} />
          <Line x1="7" y1="7" x2="7" y2="7.01" {...stroke} />
        </Svg>
      );

    case "chart":
      return (
        <Svg {...common}>
          <Line x1="4" y1="20" x2="20" y2="20" {...stroke} />
          <Rect x="6" y="13" width="3.2" height="7" rx="0.6" {...stroke} />
          <Rect x="10.4" y="9" width="3.2" height="11" rx="0.6" {...stroke} />
          <Rect x="14.8" y="4.5" width="3.2" height="15.5" rx="0.6" {...stroke} />
        </Svg>
      );

    case "settings":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="3.2" {...stroke} />
          <Path
            d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.66 6.34l-1.42 1.42M7.76 16.24l-1.42 1.42M17.66 17.66l-1.42-1.42M7.76 7.76 6.34 6.34"
            {...stroke}
          />
        </Svg>
      );

    case "wave":
      return (
        <Svg {...common}>
          <Path
            d="M8.5 13.5 5 10a1.4 1.4 0 0 0-2 2l4.5 5.2A5 5 0 0 0 11.3 19h3.4a4 4 0 0 0 4-4v-3.3"
            {...stroke}
          />
          <Path d="M9 12.5V5a1.3 1.3 0 1 1 2.6 0v6" {...stroke} />
          <Path d="M11.6 11V4a1.3 1.3 0 1 1 2.6 0v7" {...stroke} />
          <Path d="M14.2 11.3V5.3a1.3 1.3 0 1 1 2.6 0v7.2" {...stroke} />
          <Path d="M16.8 12.8v-2a1.3 1.3 0 1 1 2.6 0v4" {...stroke} />
        </Svg>
      );

    case "flame":
      return (
        <Svg {...common}>
          <Path
            d="M12 21.5c-3.6 0-6.5-2.6-6.5-6.2 0-2.6 1.4-4 2.5-5.8.6 1 1.5 1.6 2.2 1.2-.5-2.4.2-5 3-7.2.2 2.6 1.2 4 2.6 5.6 1.6 1.8 2.7 3.6 2.7 6.2 0 3.6-2.9 6.2-6.5 6.2Z"
            {...stroke}
          />
        </Svg>
      );

    case "pencil":
      return (
        <Svg {...common}>
          <Path d="m14.5 4.5 5 5L8 21H3v-5L14.5 4.5Z" {...stroke} />
          <Line x1="12.5" y1="6.5" x2="17.5" y2="11.5" {...stroke} />
        </Svg>
      );

    case "pin":
      return (
        <Svg {...common}>
          <Path
            d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11Z"
            {...stroke}
          />
          <Circle cx="12" cy="10" r="2.2" {...stroke} />
        </Svg>
      );

    case "lightbulb":
      return (
        <Svg {...common}>
          <Path
            d="M9 18.5h6M9.7 21h4.6"
            {...stroke}
          />
          <Path
            d="M12 3.5A5.8 5.8 0 0 0 6.2 9.3c0 2.5 1.5 3.9 2.4 4.9.6.6 1 1.3 1.1 2.1h4.6c.1-.8.5-1.5 1.1-2.1.9-1 2.4-2.4 2.4-4.9A5.8 5.8 0 0 0 12 3.5Z"
            {...stroke}
          />
        </Svg>
      );

    case "dice":
      return (
        <Svg {...common}>
          <Rect x="4" y="4" width="16" height="16" rx="3.5" {...stroke} />
          <Circle cx="8.3" cy="8.3" r="1.1" fill={color} />
          <Circle cx="15.7" cy="8.3" r="1.1" fill={color} />
          <Circle cx="12" cy="12" r="1.1" fill={color} />
          <Circle cx="8.3" cy="15.7" r="1.1" fill={color} />
          <Circle cx="15.7" cy="15.7" r="1.1" fill={color} />
        </Svg>
      );

    case "lifebuoy":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Circle cx="12" cy="12" r="3.5" {...stroke} />
          <Line x1="6.1" y1="6.1" x2="9.5" y2="9.5" {...stroke} />
          <Line x1="17.9" y1="6.1" x2="14.5" y2="9.5" {...stroke} />
          <Line x1="6.1" y1="17.9" x2="9.5" y2="14.5" {...stroke} />
          <Line x1="17.9" y1="17.9" x2="14.5" y2="14.5" {...stroke} />
        </Svg>
      );

    case "calculator":
      return (
        <Svg {...common}>
          <Rect x="5" y="3" width="14" height="18" rx="2" {...stroke} />
          <Line x1="7.5" y1="6.5" x2="16.5" y2="6.5" {...stroke} />
          <Line x1="7.5" y1="10.5" x2="7.5" y2="10.51" {...stroke} strokeWidth={strokeWidth + 1.2} />
          <Line x1="12" y1="10.5" x2="12" y2="10.51" {...stroke} strokeWidth={strokeWidth + 1.2} />
          <Line x1="16.5" y1="10.5" x2="16.5" y2="10.51" {...stroke} strokeWidth={strokeWidth + 1.2} />
          <Line x1="7.5" y1="14" x2="7.5" y2="14.01" {...stroke} strokeWidth={strokeWidth + 1.2} />
          <Line x1="12" y1="14" x2="12" y2="14.01" {...stroke} strokeWidth={strokeWidth + 1.2} />
          <Line x1="16.5" y1="13" x2="16.5" y2="17.5" {...stroke} />
          <Line x1="7.5" y1="17.5" x2="7.5" y2="17.51" {...stroke} strokeWidth={strokeWidth + 1.2} />
          <Line x1="12" y1="17.5" x2="12" y2="17.51" {...stroke} strokeWidth={strokeWidth + 1.2} />
        </Svg>
      );

    case "letter-ru":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M9.5 8v8M9.5 8H13a2.2 2.2 0 0 1 0 4.4H9.5M12.5 12.4 15.5 16" {...stroke} />
        </Svg>
      );

    case "letter-en":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M9 16 12 8l3 8M9.9 13.6h4.2" {...stroke} />
        </Svg>
      );

    case "flask":
      return (
        <Svg {...common}>
          <Path d="M10 3h4" {...stroke} />
          <Path d="M10.5 3v5.5L5.8 17a2 2 0 0 0 1.8 2.9h8.8a2 2 0 0 0 1.8-2.9l-4.7-8.5V3" {...stroke} />
          <Line x1="8" y1="14" x2="16" y2="14" {...stroke} />
        </Svg>
      );

    case "atom":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="1.6" fill={color} />
          <G>
            <Path d="M12 12a9 4.2 0 1 0 0 0.01" {...stroke} />
          </G>
          <Path
            d="M12 3.3c3.7 2.1 6 5.9 6 8.7s-2.3 6.6-6 8.7c-3.7-2.1-6-5.9-6-8.7s2.3-6.6 6-8.7Z"
            {...stroke}
            transform="rotate(60 12 12)"
          />
          <Path
            d="M12 3.3c3.7 2.1 6 5.9 6 8.7s-2.3 6.6-6 8.7c-3.7-2.1-6-5.9-6-8.7s2.3-6.6 6-8.7Z"
            {...stroke}
            transform="rotate(-60 12 12)"
          />
          <Path
            d="M12 3.3c3.7 2.1 6 5.9 6 8.7s-2.3 6.6-6 8.7c-3.7-2.1-6-5.9-6-8.7s2.3-6.6 6-8.7Z"
            {...stroke}
          />
        </Svg>
      );

    case "lock":
      return (
        <Svg {...common}>
          <Rect x="5" y="10.5" width="14" height="9.5" rx="2" {...stroke} />
          <Path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" {...stroke} />
        </Svg>
      );

    case "circle-outline":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="7.5" {...stroke} />
        </Svg>
      );

    case "circle-dot":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="7.5" {...stroke} />
          <Circle cx="12" cy="12" r="2.6" fill={color} />
        </Svg>
      );

    case "check-circle":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Polyline points="8.2,12.3 10.7,14.8 15.8,9.4" {...stroke} />
        </Svg>
      );

    case "circle-filled-green":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="7.5" fill={colors.success} />
        </Svg>
      );

    case "circle-filled-yellow":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="7.5" fill={colors.warning} />
        </Svg>
      );

    case "circle-filled-red":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="7.5" fill={colors.error} />
        </Svg>
      );

    case "skull":
      return (
        <Svg {...common}>
          <Path
            d="M12 3.5a7 7 0 0 0-7 7c0 2.4 1.1 3.9 2.2 5v2.3c0 .7.6 1.2 1.2 1.2h1.1v1.8h1.9v-1.8h1.2v1.8h1.9v-1.8h1.1c.7 0 1.2-.6 1.2-1.2v-2.3c1.1-1.1 2.2-2.6 2.2-5a7 7 0 0 0-7-7Z"
            {...stroke}
          />
          <Circle cx="9.3" cy="11" r="1.4" fill={color} />
          <Circle cx="14.7" cy="11" r="1.4" fill={color} />
          <Path d="M11.3 12.8h1.4l-.7 1.6-.7-1.6Z" fill={color} />
        </Svg>
      );

    case "sword":
      return (
        <Svg {...common}>
          <Path d="m14.5 3.5 6 6-9 9-3.2.7.7-3.2 9-9Z" {...stroke} />
          <Line x1="13.2" y1="7.8" x2="16.2" y2="10.8" {...stroke} />
          <Line x1="3.5" y1="20.5" x2="7" y2="17" {...stroke} />
          <Path d="M6 15 3.5 12.5" {...stroke} />
          <Path d="M9 18 6.5 20.5" {...stroke} />
        </Svg>
      );

    case "close":
      return (
        <Svg {...common}>
          <Line x1="6" y1="6" x2="18" y2="18" {...stroke} />
          <Line x1="18" y1="6" x2="6" y2="18" {...stroke} />
        </Svg>
      );

    case "send":
      return (
        <Svg {...common}>
          <Path d="M4.5 12 20 4.5 13.5 20l-2.3-6.2L4.5 12Z" {...stroke} />
          <Line x1="11.2" y1="13.8" x2="20" y2="4.5" {...stroke} />
        </Svg>
      );

    case "check":
      return (
        <Svg {...common}>
          <Polyline points="5,12.5 9.5,17 19,7" {...stroke} />
        </Svg>
      );

    case "x-circle":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Line x1="9" y1="9" x2="15" y2="15" {...stroke} />
          <Line x1="15" y1="9" x2="9" y2="15" {...stroke} />
        </Svg>
      );

    case "confused":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Line x1="8.3" y1="9.7" x2="10.2" y2="9.7" {...stroke} />
          <Path d="M13.8 9.2q1-1 2.4-.5" {...stroke} />
          <Path d="M8.3 15.5q3.7-2.2 7.4 0" {...stroke} />
        </Svg>
      );

    case "chevron-up":
      return (
        <Svg {...common}>
          <Polyline points="6,15 12,9 18,15" {...stroke} />
        </Svg>
      );

    case "chevron-down":
      return (
        <Svg {...common}>
          <Polyline points="6,9 12,15 18,9" {...stroke} />
        </Svg>
      );

    case "plus":
      return (
        <Svg {...common}>
          <Line x1="12" y1="5" x2="12" y2="19" {...stroke} />
          <Line x1="5" y1="12" x2="19" y2="12" {...stroke} />
        </Svg>
      );

    case "trash":
      return (
        <Svg {...common}>
          <Path d="M5 7h14" {...stroke} />
          <Path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" {...stroke} />
          <Path d="M7 7l1 13a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4l1-13" {...stroke} />
          <Line x1="10" y1="11" x2="10" y2="17" {...stroke} />
          <Line x1="14" y1="11" x2="14" y2="17" {...stroke} />
        </Svg>
      );

    case "flag":
      return (
        <Svg {...common}>
          <Line x1="6" y1="3.5" x2="6" y2="21" {...stroke} />
          <Path d="M6 4.5h11l-2.6 3.5L17 11.5H6Z" {...stroke} />
        </Svg>
      );

    case "trophy":
      return (
        <Svg {...common}>
          <Path d="M8 4.5h8v5a4 4 0 0 1-8 0v-5Z" {...stroke} />
          <Path d="M8 5.5H5a1 1 0 0 0-1 1c0 2.3 1.6 3.9 4 4.2" {...stroke} />
          <Path d="M16 5.5h3a1 1 0 0 1 1 1c0 2.3-1.6 3.9-4 4.2" {...stroke} />
          <Line x1="12" y1="13.5" x2="12" y2="17" {...stroke} />
          <Line x1="8.5" y1="20.5" x2="15.5" y2="20.5" {...stroke} />
          <Path d="M9.5 20.5c0-1.8 1-2.7 2.5-2.7s2.5.9 2.5 2.7" {...stroke} />
        </Svg>
      );

    case "bolt":
      return (
        <Svg {...common}>
          <Path d="M13 3 5.5 13.5H11L10.5 21 18.5 10H13V3Z" {...stroke} />
        </Svg>
      );

    case "target":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Circle cx="12" cy="12" r="5" {...stroke} />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
        </Svg>
      );

    case "star":
      return (
        <Svg {...common}>
          <Path
            d="M12 3.5l2.4 5.3 5.7.6-4.3 3.9 1.2 5.7L12 16.2l-5 2.8 1.2-5.7-4.3-3.9 5.7-.6L12 3.5Z"
            {...stroke}
          />
        </Svg>
      );

    case "sparkle-star":
      return (
        <Svg {...common}>
          <Path
            d="M12 2.5c.4 3.4 1.4 5.6 3 7.2 1.6 1.6 3.8 2.6 7.2 3-3.4.4-5.6 1.4-7.2 3-1.6 1.6-2.6 3.8-3 7.2-.4-3.4-1.4-5.6-3-7.2-1.6-1.6-3.8-2.6-7.2-3 3.4-.4 5.6-1.4 7.2-3 1.6-1.6 2.6-3.8 3-7.2Z"
            {...stroke}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case "muscle":
      return (
        <Svg {...common}>
          <Path
            d="M6 13.5V9a2 2 0 0 1 2-2h1.5a1 1 0 0 1 1 1v1.2"
            {...stroke}
          />
          <Path
            d="M10.5 9.2h4.3c1.9 0 3.7.9 4.8 2.4l.6.8c.5.7.3 1.7-.5 2.1-.6.3-1.3.1-1.7-.4l-1-1.3v3.7a3.5 3.5 0 0 1-3.5 3.5H10a3.5 3.5 0 0 1-3.5-3.5v-3"
            {...stroke}
          />
        </Svg>
      );

    default:
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
        </Svg>
      );
  }
}
