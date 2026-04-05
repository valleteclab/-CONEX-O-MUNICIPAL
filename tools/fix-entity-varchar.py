"""Add type: 'varchar' to TypeORM columns that use length: without explicit type."""
import re
from pathlib import Path

ENT = Path(__file__).resolve().parents[1] / "apps" / "api" / "src" / "entities"

# Depois: name: 'x', length: → name: 'x', type: 'varchar', length:
NAME_LEN = re.compile(
    r"(@Column\(\{\s*name:\s*'[^']+',)\s*(length:)",
)

# Primeiro: @Column({ length: → @Column({ type: 'varchar', length:
PLAIN_LEN = re.compile(r"@Column\(\{\s*length:")


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    text = PLAIN_LEN.sub("@Column({ type: 'varchar', length:", text)
    text = NAME_LEN.sub(r"\1 type: 'varchar', \2", text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    for f in sorted(ENT.glob("*.ts")):
        if fix_file(f):
            print("updated:", f.name)


if __name__ == "__main__":
    main()
