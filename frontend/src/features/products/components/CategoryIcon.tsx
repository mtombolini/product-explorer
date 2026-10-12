import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import DevicesOtherOutlinedIcon from '@mui/icons-material/DevicesOtherOutlined';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import ManOutlinedIcon from '@mui/icons-material/ManOutlined';
import WomanOutlinedIcon from '@mui/icons-material/WomanOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

/**
 * One icon per category we know, by its key. The empty key is "All".
 * Any other category gets a neutral label icon.
 */
const CATEGORY_ICONS: Record<string, SvgIconComponent> = {
  '': AppsOutlinedIcon,
  electronics: DevicesOtherOutlinedIcon,
  jewelery: DiamondOutlinedIcon,
  "men's clothing": ManOutlinedIcon,
  "women's clothing": WomanOutlinedIcon,
};

interface CategoryIconProps {
  /** The category key, or an empty string for "All". */
  category: string;
}

/** Decoration next to the category name, hidden from screen readers. */
export function CategoryIcon({ category }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[category] ?? LabelOutlinedIcon;
  return <Icon aria-hidden fontSize="small" />;
}
