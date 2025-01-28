<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Support\Http;
use Fleetbase\Types\Country;
use Fleetbase\Types\Currency;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LookupController extends Controller
{
    /**
     * Query and search font awesome icons.
     *
     * @return \Illuminate\Http\Response
     */
    public function fontAwesomeIcons(Request $request)
    {
        $query  = $request->input('query');
        $id     = $request->input('id');
        $prefix = $request->input('prefix');
        $limit  = $request->input('limit');

        $content = file_get_contents('https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/metadata/icons.json');
        $json    = json_decode($content);
        $icons   = [];

        $count = 0;

        if ($query) {
            $query = strtolower($query);
        }

        foreach ($json as $icon => $value) {
            $searchTerms = [...$value->search->terms, strtolower($value->label)];

            if (
                $query && collect($searchTerms)->every(
                    function ($term) use ($query) {
                        return !Str::contains($term, $query);
                    }
                )
            ) {
                continue;
            }

            if ($limit && $count >= $limit) {
                break;
            }

            if ($id && $id !== $icon) {
                continue;
            }

            foreach ($value->styles as $style) {
                $iconPrefix = 'fa' . substr($style, 0, 1);

                if ($prefix && $prefix !== $iconPrefix) {
                    continue;
                }

                $icons[] = [
                    'prefix' => $iconPrefix,
                    'label'  => $value->label,
                    'id'     => $icon,
                ];
            }

            $count++;
        }

        return $icons;
    }

    /**
     * Request IP lookup on user client.
     *
     * @return \Illuminate\Http\Response
     */
    public function whois(Request $request)
    {
        try {
            $info = Http::lookupIp($request);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }

        return response()->json($info);
    }

    /**
     * Get all countries with search enabled.
     *
     * @return \Illuminate\Http\Response
     */
    public function currencies(Request $request)
    {
        $query = strtolower($request->input('query'));

        $currencies = Currency::filter(
            function ($currency) use ($query) {
                if ($query) {
                    return Str::contains(strtolower($currency->getCode()), $query) || Str::contains(strtolower($currency->getTitle()), $query);
                }

                return true;
            }
        );

        return response()->json($currencies);
    }

    /**
     * Get all countries with search enabled.
     *
     * @return \Illuminate\Http\Response
     */
    public function countries(Request $request)
    {
        $query   = strtolower($request->input('query', null));
        $simple  = $request->boolean('simple');
        $columns = $request->array('columns');
        $only    = array_map(fn ($s) => strtolower($s), $request->array('only'));
        $except  = array_map(fn ($s) => strtolower($s), $request->array('except'));

        $countries = Country::search($query);

        if ($columns) {
            $countries = $countries->map(
                function ($country) use ($columns) {
                    return $country->only($columns);
                }
            );
        }

        if ($simple) {
            $countries = $countries->map(
                function ($country) {
                    return $country->simple();
                }
            );
        }

        if ($only) {
            $countries = $countries->filter(function ($country) use ($only) {
                return in_array(strtolower(data_get($country, 'cca2')), $only);
            });
        }

        if ($except) {
            $countries = $countries->filter(function ($country) use ($except) {
                return !in_array(strtolower(data_get($country, 'cca2')), $except);
            });
        }

        return response()->json($countries->values());
    }

    /**
     * Lookup a country by it's country or currency code.
     *
     * @param string $code
     *
     * @return \Illuminate\Http\Response
     */
    public function country($code, Request $request)
    {
        $simple  = $request->boolean('simple', true);
        $country = Country::search($code)->first();

        if ($simple && $country) {
            $country = $country->simple();
        }

        return response()->json($country);
    }

    /**
     * Pull the Fleetbase.io blog RSS feed.
     *
     * @param Request
     *
     * @return \Illuminate\Http\Response
     */
    public function fleetbaseBlog(Request $request)
    {
        $limit  = $request->integer('limit', 6);
        $rssUrl = 'https://www.fleetbase.io/post/rss.xml';
        $rss    = simplexml_load_file($rssUrl);
        $posts  = [];

        foreach ($rss->channel->item as $item) {
            $posts[] = [
                'title'           => (string) $item->title,
                'link'            => (string) $item->link,
                'guid'            => (string) $item->guid,
                'description'     => (string) $item->description,
                'pubDate'         => (string) $item->pubDate,
                'media_content'   => (string) data_get($item, 'media:content.url'),
                'media_thumbnail' => (string) data_get($item, 'media:thumbnail.url'),
            ];
        }

        $posts = array_slice($posts, 0, $limit);

        return response()->json($posts);
    }
}
