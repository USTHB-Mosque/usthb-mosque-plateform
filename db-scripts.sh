#!/bin/bash
# Database Scripts for USTHB Mosque Platform

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  USTHB Mosque Platform - DB Tools  ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Function to show usage
usage() {
  echo "Usage: ./db-scripts.sh [command]"
  echo ""
  echo "Commands:"
  echo "  status     - Show Supabase status"
  echo "  studio     - Open Supabase Studio (web UI)"
  echo "  psql       - Connect to database via psql"
  echo "  tables     - List all tables"
  echo "  seed       - Run all seed scripts"
  echo "  seed-media - Seed media only"
  echo "  seed-books - Seed books only"
  echo "  seed-all   - Full seed with custom count"
  echo "  reset      - Reset database (WARNING: deletes all data)"
  echo ""
}

# Parse command
COMMAND=$1

case $COMMAND in
  status)
    echo -e "${YELLOW}Checking Supabase status...${NC}"
    pnpm supabase:status
    ;;
  studio)
    echo -e "${YELLOW}Opening Supabase Studio...${NC}"
    pnpm supabase:studio
    ;;
  psql)
    echo -e "${YELLOW}Connecting to database...${NC}"
    echo -e "${YELLOW}Connection: postgresql://postgres:postgres@127.0.0.1:54322/postgres${NC}"
    pnpm supabase:psql
    ;;
  tables)
    echo -e "${YELLOW}Listing all tables...${NC}"
    pnpm supabase:psql -c "\dt"
    ;;
  seed)
    echo -e "${YELLOW}Running all seed scripts...${NC}"
    pnpm seed
    ;;
  seed-media)
    echo -e "${YELLOW}Seeding media...${NC}"
    pnpm seed:media
    ;;
  seed-books)
    echo -e "${YELLOW}Seeding books...${NC}"
    pnpm seed:books
    ;;
  seed-all)
    COUNT=${2:-50}
    echo -e "${YELLOW}Running full seed with $COUNT items per type...${NC}"
    echo "This will seed: media, books, activities, articles, loans, favorites, registrations"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      tsx -e "
        import { seedMedias } from './utils/seed/media'
        import { seedBooks } from './utils/seed/book'
        import { seedActivities } from './utils/seed/activities'
        import { seedArticles } from './utils/seed/articles'
        import { seedLoans } from './utils/seed/loans'
        import { seedBookFavorites } from './utils/seed/book-favorites'
        import { seedActivityRegistrations } from './utils/seed/activity-registrations'
        
        const count = $COUNT
        
        async function main() {
          console.log('Seeding with count:', count)
          await seedMedias(count)
          await seedBooks(count)
          await seedActivities(count)
          await seedArticles(count)
          await seedLoans(Math.floor(count * 0.6))
          await seedBookFavorites(Math.floor(count * 0.6))
          await seedActivityRegistrations(Math.floor(count * 0.6))
          console.log('All done!')
        }
        
        main()
      "
    fi
    ;;
  reset)
    echo -e "${YELLOW}WARNING: This will delete ALL data in the database!${NC}"
    read -p "Type 'yes' to confirm: " -r
    echo
    if [[ $REPLY == "yes" ]]; then
      echo -e "${YELLOW}Stopping Supabase...${NC}"
      pnpm supabase:stop
      echo -e "${YELLOW}Starting Supabase...${NC}"
      pnpm supabase:start
      echo -e "${YELLOW}Running migrations...${NC}"
      pnpm payload:migrate
      echo -e "${GREEN}Database reset complete!${NC}"
    else
      echo "Cancelled."
    fi
    ;;
  *)
    usage
    ;;
esac