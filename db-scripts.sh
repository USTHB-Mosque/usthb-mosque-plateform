#!/bin/bash
# Database Scripts for USTHB Mosque Platform

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  USTHB Mosque Platform - DB Tools  ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Function to show usage
usage() {
  echo "Usage: ./db-scripts.sh [command]"
  echo ""
  echo "Database:"
  echo "  status     - Show Supabase status"
  echo "  studio     - Open Supabase Studio (web UI)"
  echo "  psql       - Connect to database via psql"
  echo "  tables     - List all tables"
  echo "  counts     - Show document counts per collection"
  echo ""
  echo "Seeding:"
  echo "  seed       - Run all seed scripts"
  echo "  seed:all   - Run all seed scripts (alias)"
  echo "  seed:all --force   - Force reseed all collections"
  echo "  seed:all --dry-run - Preview what would be seeded"
  echo "  seed:all --count N - Seed N items per collection"
  echo "  seed:media - Seed media only"
  echo "  seed:users - Seed users only"
  echo "  seed:books - Seed books only"
  echo "  seed:activities - Seed activities only"
  echo "  seed:articles - Seed articles only"
  echo "  seed:loans - Seed loans only"
  echo "  seed:favorites - Seed book favorites only"
  echo "  seed:registrations - Seed activity registrations only"
  echo ""
  echo "Reset:"
  echo "  reset      - Reset database (WARNING: deletes all data)"
  echo "  reset:users - Reset users collection"
  echo "  reset:media - Reset media collection"
  echo "  reset:books - Reset books collection"
  echo "  reset:activities - Reset activities collection"
  echo "  reset:articles - Reset articles collection"
  echo "  reset:loans - Reset loans collection"
  echo "  reset:favorites - Reset book favorites collection"
  echo "  reset:registrations - Reset activity registrations collection"
  echo ""
  echo "Interactive:"
  echo "  interactive - Interactive mode for seeding/resetting"
  echo ""
}

# Function to run a single collection seed
seed_collection() {
  local collection=$1
  local count=${2:-50}
  
  echo -e "${YELLOW}Seeding ${collection} (${count} items)...${NC}"
  
  case $collection in
    users)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedUsers, createAdminUser } from './utils/seed/users'
        
        const payload = await getPayload({ config })
        await createAdminUser(payload)
        await seedUsers(payload, { count: $count, force: true })
      "
      ;;
    media)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedMedias } from './utils/seed/media'
        
        const payload = await getPayload({ config })
        await seedMedias(payload, { count: $count, force: true })
      "
      ;;
    books)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedBooks } from './utils/seed/book'
        
        const payload = await getPayload({ config })
        await seedBooks(payload, { count: $count, force: true })
      "
      ;;
    activities)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedActivities } from './utils/seed/activities'
        
        const payload = await getPayload({ config })
        await seedActivities(payload, { count: $count, force: true })
      "
      ;;
    articles)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedArticles } from './utils/seed/articles'
        
        const payload = await getPayload({ config })
        await seedArticles(payload, { count: $count, force: true })
      "
      ;;
    loans)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedLoans } from './utils/seed/loans'
        
        const payload = await getPayload({ config })
        await seedLoans(payload, { count: $count, force: true })
      "
      ;;
    favorites)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedBookFavorites } from './utils/seed/book-favorites'
        
        const payload = await getPayload({ config })
        await seedBookFavorites(payload, { count: $count, force: true })
      "
      ;;
    registrations)
      pnpm tsx -e "
        import 'dotenv/config'
        import { getPayload } from 'payload'
        import config from '@/payload.config'
        import { seedActivityRegistrations } from './utils/seed/activity-registrations'
        
        const payload = await getPayload({ config })
        await seedActivityRegistrations(payload, { count: $count, force: true })
      "
      ;;
    *)
      echo -e "${RED}Unknown collection: $collection${NC}"
      exit 1
      ;;
  esac
}

# Function to reset a single collection
reset_collection() {
  local collection=$1
  
  case $collection in
    users|media|books|activities|articles|loans|favorites|registrations)
      pnpm tsx utils/reset-collection.ts "$collection"
      ;;
    book-favorites)
      pnpm tsx utils/reset-collection.ts "book-favorites"
      ;;
    activity-registrations)
      pnpm tsx utils/reset-collection.ts "activity-registrations"
      ;;
    *)
      echo -e "${RED}Unknown collection: $collection${NC}"
      echo "Valid: users, media, books, activities, articles, loans, favorites, registrations"
      exit 1
      ;;
  esac
}

# Parse command
COMMAND=$1
shift 2>/dev/null

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
  counts)
    echo -e "${YELLOW}Getting collection counts...${NC}"
    pnpm tsx utils/db-counts.ts
    ;;
  seed|seed:all)
    echo -e "${YELLOW}Running full seed...${NC}"
    pnpm tsx utils/seed-all.ts "$@"
    ;;
  seed:users|seed:media|seed:books|seed:activities|seed:articles|seed:loans|seed:favorites|seed:registrations)
    COLLECTION=${COMMAND#seed:}
    COUNT=${1:-50}
    seed_collection "$COLLECTION" "$COUNT"
    ;;
  reset)
    echo -e "${RED}WARNING: This will delete ALL data in the database!${NC}"
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
  reset:*)
    COLLECTION=${COMMAND#reset:}
    echo -e "${YELLOW}Resetting ${COLLECTION} collection...${NC}"
    reset_collection "$COLLECTION"
    ;;
  interactive)
    echo -e "${BLUE}🔧 Interactive Database Tool${NC}"
    echo ""
    echo "What do you want to do?"
    echo "1) Seed collections"
    echo "2) Reset collections"
    echo "3) View counts"
    echo ""
    read -p "Choice (1-3): " ACTION
    
    case $ACTION in
      1)
        echo ""
        echo "Which collections? (comma-separated, or 'all')"
        echo "  users, media, books, activities, articles, loans, favorites, registrations"
        echo ""
        read -p "Collections: " COLLECTIONS_INPUT
        
        if [ "$COLLECTIONS_INPUT" = "all" ]; then
          echo ""
          read -p "Count per collection [50]: " COUNT
          COUNT=${COUNT:-50}
          pnpm tsx utils/seed-all.ts --count "$COUNT" --force
        else
          echo ""
          read -p "Count per collection [50]: " COUNT
          COUNT=${COUNT:-50}
          
          IFS=',' read -ra COLLECTIONS_ARRAY <<< "$COLLECTIONS_INPUT"
          for col in "${COLLECTIONS_ARRAY[@]}"; do
            col=$(echo "$col" | xargs)
            seed_collection "$col" "$COUNT"
          done
        fi
        ;;
      2)
        echo ""
        echo "Which collections? (comma-separated, or 'all')"
        echo "  users, media, books, activities, articles, loans, favorites, registrations"
        echo ""
        read -p "Collections: " COLLECTIONS_INPUT
        
        if [ "$COLLECTIONS_INPUT" = "all" ]; then
          echo -e "${RED}WARNING: This will delete ALL data!${NC}"
          read -p "Type 'yes' to confirm: " -r
          echo
          if [[ $REPLY == "yes" ]]; then
            pnpm supabase:stop
            pnpm supabase:start
            pnpm payload:migrate
            echo -e "${GREEN}Database reset complete!${NC}"
          else
            echo "Cancelled."
          fi
        else
          IFS=',' read -ra COLLECTIONS_ARRAY <<< "$COLLECTIONS_INPUT"
          for col in "${COLLECTIONS_ARRAY[@]}"; do
            col=$(echo "$col" | xargs)
            reset_collection "$col"
          done
        fi
        ;;
      3)
        pnpm tsx utils/db-counts.ts
        ;;
      *)
        echo "Invalid choice."
        ;;
    esac
    ;;
  *)
    usage
    ;;
esac
