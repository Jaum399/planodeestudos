import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import CourseCard from '../../components/CourseCard';

interface Course {
  _id: string;
  title: string;
  description: string;
  difficulty: number;
  rating: number;
  enrollment_count: number;
  total_hours: number;
  progress?: number;
  category: string;
}

const CATEGORIES = ['todas', 'medicina', 'direito', 'farmácia', 'odontologia', 'enem'];
const SPECIALIZATIONS = ['genérico', 'medicina', 'direito', 'farmácia', 'odontologia'];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    category: 'todas',
    specialization: 'genérico',
    search: '',
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [courses, filters]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses?limit=50');
      const data = await response.json();
      setCourses(data.courses || []);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar cursos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = courses;

    if (filters.category !== 'todas') {
      filtered = filtered.filter((c) => c.category === filters.category);
    }

    if (filters.specialization !== 'genérico') {
      filtered = filtered.filter((c) => c.specialization === filters.specialization);
    }

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCourses(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Cursos Disponíveis</h1>
        <p className="text-gray-400 text-sm mt-1">Explore nossos cursos estruturados e comece sua jornada de aprendizado</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-app-card border border-app-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 mt-2">Categoria:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleFilterChange('category', cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filters.category === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-app-card border border-app-border text-gray-300 hover:border-primary-500/30'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="w-full flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 mt-2">Especialidade:</span>
            {SPECIALIZATIONS.map((spec) => (
              <button
                key={spec}
                onClick={() => handleFilterChange('specialization', spec)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filters.specialization === spec
                    ? 'bg-primary-600 text-white'
                    : 'bg-app-card border border-app-border text-gray-300 hover:border-primary-500/30'
                }`}
              >
                {spec.charAt(0).toUpperCase() + spec.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-gray-400">
          {filteredCourses.length} curso{filteredCourses.length !== 1 ? 's' : ''} encontrado
          {filters.search && ` para "${filters.search}"`}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Carregando cursos...</div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-400">{error}</div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Nenhum curso encontrado</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course._id}
              id={course._id}
              title={course.title}
              description={course.description}
              difficulty={course.difficulty}
              rating={course.rating}
              enrollment_count={course.enrollment_count}
              total_hours={course.total_hours}
              progress={course.progress || 0}
              category={course.category}
            />
          ))}
        </div>
      )}
    </div>
  );
}
